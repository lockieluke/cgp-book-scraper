import * as fs from "node:fs";
import * as path from "node:path";
import Timeout from "await-timeout";
import death from "death";
import puppeteer from "puppeteer-extra";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const ON_DEATH = death({
	uncaughtException: true,
	SIGINT: true,
	SIGQUIT: true,
	SIGTERM: true,
});

puppeteer.use(AdblockerPlugin()).use(StealthPlugin());

const browser = await puppeteer.launch({
	headless: true,
	defaultViewport: {
		deviceScaleFactor: 3,
		width: 1920,
		height: 1080,
	},
});

ON_DEATH(async () => {
	await browser.close();
});

const page = await browser.newPage();
await page.goto("https://www.cgpbooks.co.uk/unlock-digital-extras");
await page.waitForSelector(
	"#p_lt_Body_lt_ctl01_RedeemLicenceCode_pnlRedeemPanel",
);
console.log("Form loaded");

const codeParts = process.env.CODE?.split(" ") ?? [];
const code1 = await page.$(
	"#p_lt_Body_lt_ctl01_RedeemLicenceCode_ucRedeemLicenceCode_LicenceCode1",
);
const code2 = await page.$(
	"#p_lt_Body_lt_ctl01_RedeemLicenceCode_ucRedeemLicenceCode_LicenceCode2",
);
const code3 = await page.$(
	"#p_lt_Body_lt_ctl01_RedeemLicenceCode_ucRedeemLicenceCode_LicenceCode3",
);
const code4 = await page.$(
	"#p_lt_Body_lt_ctl01_RedeemLicenceCode_ucRedeemLicenceCode_LicenceCode4",
);

if (code1 && code2 && code3 && code4) {
	await code1.type(codeParts[0]);
	await code2.type(codeParts[1]);
	await code3.type(codeParts[2]);
	await code4.type(codeParts[3]);
	console.log("Code entered");
}

const emailField = await page.$(
	"#p_lt_Body_lt_ctl01_RedeemLicenceCode_ucRedeemLicenceCode_txtEmailAddress",
);
const passwordField = await page.$(
	"#p_lt_Body_lt_ctl01_RedeemLicenceCode_ucRedeemLicenceCode_txtPassword",
);

if (emailField && passwordField) {
	await emailField.type(process.env.EMAIL ?? "");
	await passwordField.type(process.env.PASSWORD ?? "");
	console.log("Email and password entered");
}

await page.click(
	"#p_lt_Body_lt_ctl01_RedeemLicenceCode_ucRedeemLicenceCode_btnRegisterSignIn",
);
await page.waitForNavigation({
	waitUntil: "domcontentloaded",
});

console.log("Logged in");
await Timeout.set(1000);

const bookUrl = process.env.BOOK_URL;
if (!bookUrl) {
	console.error("Book URL is not provided");
	process.exit(1);
}

await page.goto(
	bookUrl,
	{
		waitUntil: "domcontentloaded",
	},
);
await page.waitForNavigation({
	waitUntil: "domcontentloaded",
});

console.log("Book loading");
const iframe = await (await page.waitForSelector("#mainFrame"))?.contentFrame();
if (!iframe) {
	console.error("Failed to find main iframe");
	process.exit(1);
}
await iframe.waitForSelector("#publication > div > div > div.book-container");
await iframe.waitForSelector(
	"#book > div.hard-mask.vis.layer3.hRight > div.page-flip-container.z1.gradient-light.hard-front.outside > div > div.touch-layer > div.content.vis",
);
await Timeout.set(2200);
console.log("Book loaded");

const pageDir = path.join(process.cwd(), "screenshots");
if (!(await fs.promises.exists(pageDir))) await fs.promises.mkdir(pageDir);

const totalPageField = await iframe.$("#top > span.pager > span.pager-total");
if (!totalPageField) {
	console.error("Failed to find total page field");
	process.exit(1);
}
const totalPage = await totalPageField.evaluate((el) => el.textContent);

let index = 0;
const capturePagesAndFlip = async () => {
	const bookContent = await iframe.$(
		"#book > div.hard-mask.vis.layer3.hRight > div.page-flip-container.z1.gradient-light.hard-front.outside > div > div.touch-layer > div.content.vis",
	);
	const pageNumberField = await iframe.$(
		"#top > span.pager > input[type=text]",
	);
	const pageNumber = await pageNumberField?.evaluate((el) => el.value);
	if (pageNumber === "BC" || pageNumber === totalPage) {
		console.log("Reached the end of the book");
		return;
	}

	if (bookContent) {
		console.log(`Capturing page ${pageNumber}/${totalPage}`);
		await bookContent.screenshot({
			path: path.join(pageDir, `${index}-${pageNumber}.png`),
			type: "png",
		});
	} else if (!bookContent) {
		let insideBookContentL = await iframe.$(
			"#book > div.hard-mask.vis.layer3 > div.page-flip-container.z3.gradient-light.hard-front.inside > div > div.touch-layer > div.content.vis",
		);
		const insideBookContentR = await iframe.$(
			"#book > div.mask.vis.mR.layer3 > div.page-flip-container.z1.gradient-light.reflex-right.right-page > div.page.light.right-stripe > div.touch-layer > div.content.vis",
		);
		const leftPageNumber = pageNumber?.split(" - ")[0];
		const rightPageNumber = pageNumber?.split(" - ")[1];

		if (!insideBookContentL)
			insideBookContentL = await iframe.$(
				"#book > div:nth-child(7) > div.page-flip-container.z1.gradient-light.reflex-left > div.page.light.left-stripe > div.touch-layer > div.content.vis",
			);

		if (!insideBookContentL) {
			await Timeout.set(500);
			insideBookContentL = await iframe.$(
				"#book > div:nth-child(7) > div.page-flip-container.z1.gradient-light.reflex-left > div.page.light.left-stripe > div.touch-layer > div.content.vis",
			);
		}

		if (
			insideBookContentL &&
			insideBookContentR &&
			leftPageNumber &&
			rightPageNumber
		) {
			console.log(`Capturing page ${leftPageNumber}/${totalPage}`);
			await insideBookContentL?.screenshot({
				path: path.join(pageDir, `${index}-${leftPageNumber}.png`),
				type: "png",
			});

			console.log(`Capturing page ${rightPageNumber}/${totalPage}`);
			await insideBookContentR?.screenshot({
				path: path.join(pageDir, `${index}-${rightPageNumber}.png`),
				type: "png",
			});
		} else {
			console.error("Failed to find inside book content");
		}
	} else {
		console.error("Failed to find book content");
		process.exit(1);
	}

	await iframe.click(
		"#book-holder > div.next-button > button.icon-book-next.stripe-btn",
	);
	await Timeout.set(500);
	index++;
	await capturePagesAndFlip();
};

await capturePagesAndFlip();
