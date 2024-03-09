import figlet from 'figlet';
import puppeteer, { Browser, Page } from 'puppeteer';
import moment from 'moment';
import { MINIMAL_ARGS } from './contants';
export const generateAsciiArt = (str: string) => {
	return new Promise((resolve, reject) => {
		figlet.text(str, (err, data) => {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};
export const temp = () => {
	console.log(__dirname);
};
export const withBrowser = async (
	callback: (browser: Browser) => void,
) => {
	const browser = await puppeteer.launch({
		headless: true,
		args: MINIMAL_ARGS,

	});
	try {
		await callback(browser);
	} finally {
		await browser.close();
	}
};
export const withPage = async (
	browser: Browser,
	callback: (page: Page) => void,
) => {
	const page = await browser.newPage();
	try {
		await callback(page);
	} finally {
		await page.close();
	}
};
export const capitalize = (string: string) => {
	return string
		.split(' ')
		.map((str) => str.charAt(0).toUpperCase() + str.slice(1))
		.join(' ');
};

export const genPDF = async (page: Page, filename: string) => {



}

export const parseSheetJSDate = (excelDate: number) => {
	const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return moment(`${day}/${month}/${year}`, 'DD/MM/YYYY').format('DD-MM-YYYY');
}