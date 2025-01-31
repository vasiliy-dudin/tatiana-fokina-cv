const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");
const yaml = require("js-yaml");
const { PDFDocument, PDFName } = require("pdf-lib");

function generateXMPMetadata(metadata) {
	return `
		<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
			<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.4-c006 80.159825, 2016/09/16-03:31:08">
				<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
					<rdf:Description rdf:about=""
						xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/"
						xmlns:dc="http://purl.org/dc/elements/1.1/">
						<pdfuaid:part>1</pdfuaid:part>
						<dc:title>
							<rdf:Alt>
								<rdf:li xml:lang="x-default">${metadata.title}</rdf:li>
							</rdf:Alt>
						</dc:title>
						<dc:creator>
							<rdf:Seq>
								<rdf:li>${metadata.creator}</rdf:li>
							</rdf:Seq>
						</dc:creator>
							<dc:description>
								<rdf:Alt>
									<rdf:li xml:lang="x-default">${metadata.description}</rdf:li>
								</rdf:Alt>
							</dc:description>
					</rdf:Description>
				</rdf:RDF>
			</x:xmpmeta>
		<?xpacket end="w"?>`.trim();
}

// Create metadata with pdf-lib
async function addPDFMeta(pdfPath, metadata) {
	const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
	const pages = pdfDoc.getPages();

	// Create XMP metadata
	const xmpMetadata = generateXMPMetadata(metadata);

	// Add XMP metadata
	const metadataStream = pdfDoc.context.flateStream(xmpMetadata);
	const metadataStreamRef = pdfDoc.context.register(metadataStream);
	pdfDoc.catalog.set(PDFName.of("Metadata"), metadataStreamRef);

	// Add PDF/UA identifier
	pdfDoc.setSubject("PDF/UA-1");

	// Set tab order for all pages
	pages.forEach((page) => {
		page.node.set(PDFName.of("Tabs"), PDFName.of("S"));
	});

	const pdfBytes = await pdfDoc.save({ updateMetadata: false });
	await fs.writeFile(pdfPath, pdfBytes);
}

async function generatePDF(htmlFile) {
	const baseName = path.basename(htmlFile, '.html');
	const outputPath = path.join(__dirname, "dist", `${baseName}.pdf`);
	const htmlPath = path.join(__dirname, "dist", htmlFile);
	const cssPath = path.join(__dirname, "dist/styles.css");
	const dataPath = path.join(__dirname, "src/pdf-metadata.yaml");

	try {
		const html = await fs.readFile(htmlPath, "utf8");
		const css = await fs.readFile(cssPath, "utf8");
		const content = `${html}<style>${css}</style>`;

		const yamlFile = await fs.readFile(dataPath, "utf8");
		const metadata = yaml.load(yamlFile);

		const browser = await puppeteer.launch();
		const page = await browser.newPage();

		await page.setContent(content, { waitUntil: "networkidle0" });
		await page.pdf({
			path: outputPath,
			displayHeaderFooter: false,
			printBackground: true,
			preferCSSPageSize: true,
			pdfA: true,
			displayTitle: true,
			outline: true,
			annotating: true,
			tagged: true,
			generateTaggedPDF: true,
			structureTreeRoot: true,
			metadata: metadata,
		});

		await browser.close();
		await addPDFMeta(outputPath, metadata);

		const stats = await fs.stat(outputPath);
		console.log(`✅ Generated ${baseName}.pdf (${stats.size} bytes)`);
	} catch (error) {
		console.error(`❌ Error processing ${htmlFile}:`, error);
	}
}

async function processHtmlFiles() {
	try {
		const files = await fs.readdir(path.join(__dirname, "dist"));
		const htmlFiles = files.filter(file => file.endsWith(".html"));

		console.log(`Found ${htmlFiles.length} HTML files to process`);
		
		for (const htmlFile of htmlFiles) {
			await generatePDF(htmlFile);
		}
		
		console.log("✨ Completed");
	} catch (error) {
		console.error("Fatal error:", error);
		process.exit(1);
	}
}

processHtmlFiles();
