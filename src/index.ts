#!/usr/bin/env node

import inquirer from 'inquirer';
import moment from 'moment';
import chalk from 'chalk';
import fs from 'fs';
import PDFMerger from 'pdf-merger-js';
import flatInfo from './flatInfo.json';
import XLSX from 'xlsx';
import { QUESTIONS } from './utils/contants';
import rimraf from 'rimraf';
import Bun from 'bun';
import mkdir from 'make-dir';
import { ExcelBill } from './types';
import { pipe, page } from 'iter-ops';
const PER_UNIT_COST = 7;
const FIXED_WATER_COST = 300;
import towords from 'convert-rupees-into-words';
import {
	generateAsciiArt,
	withBrowser,
	withPage,
	parseSheetJSDate,
} from './utils/utils';

const init = async () => {
	const startTime = new Date().getTime();
	let timeLogs = {
		puppeteer: 0,
		convert: 0,
		merge: 0,
	}
	await withBrowser(async (browser) => {
		const prompt = inquirer.createPromptModule();
		const art = await generateAsciiArt("Welcome to Satya's Bill Generator");
		console.log(chalk.green(art));
		const answers = await prompt(QUESTIONS);
		console.log(answers);
		console.log(chalk.blueBright('Checking if the FlatInfo exists...'));
		const start_time = new Date().getTime();

		if (!(flatInfo as any).flats) {
			console.log(chalk.redBright('Flat Info not found!'));
			const { infoFileName } = await prompt({
				type: 'input',
				name: 'infoFileName',
				message: 'Enter the name of the file containing the flats info',
				default: 'flatInfo.xlsx',
			});
			const workbook = XLSX.readFile(`./${infoFileName}`);
			const sheet_name_list = workbook.SheetNames;
			const xlData = XLSX.utils.sheet_to_json(
				workbook.Sheets[ sheet_name_list[ 0 ] ],
				{
					dateNF: 'dd/mm/yyyy',
				},
			);
			const flatInfo = {
				flats: xlData,
				last_updated: moment().format('DD/MM/YYYY hh:mm:ss'),
			};
			await Bun.write(__dirname + '/flatInfo.json', JSON.stringify(flatInfo));
			console.log(chalk.greenBright('Flat Info created!'));
			console.log(
				chalk.redBright('Exiting... and please run the command again'),
			);
			return;
		} else {
			console.log(chalk.greenBright('Flat Info found!'));
		}
		console.log(chalk.blueBright('Converting the Billing Info to JSON...'));
		const workbook = XLSX.readFile(`./${answers.filename}`);
		const sheet_name_list = workbook.SheetNames;
		const xlData: ExcelBill[] = XLSX.utils.sheet_to_json(
			workbook.Sheets[ sheet_name_list[ 0 ] ],
		);
		console.log(chalk.greenBright('Bill data converted to JSON!'));
		const html = fs.readFileSync(
			__dirname + '/templates/satya-bill.html',
			'utf8',
		);
		const billDataArr = pipe(xlData, page(10));
		await mkdir(__dirname + '/pdfs/');
		for (let data of billDataArr) {
			await Promise.all(
				data.map(async (billData: ExcelBill) => {
					let htmlStr = html;

					console.log(
						chalk.greenBright(`Generating PDF for Flat ${billData[ 'Flat No' ]}`),
					);
					const isMeterClosed = billData[ 'Use Unit' ] === "METER CLOSED";

					const unpaidMaintaince =
						billData[ 'Unpaid Maintaince' ]?.toString() || '';
					const unpaidWaterBill =
						billData[ 'Unpaid Water Bill' ]?.toString() || '';
					const maintenanceCost = Number(billData[ 'Maintaince' ].toString().match(/\d+/g)?.[ 0 ]);

					const waterCost = billData[ 'Current Reading' ]
						? billData[ 'Current Reading' ] - billData[ 'Previous Reading' ]
						: '';
					const { fined, other } = billData;
					const calculatedUnpaidMaintaince = Number(
						unpaidMaintaince?.includes(',')
							? unpaidMaintaince?.split(',').reduce((acc: any, curr: any) => {
								// Get the number before ( through regex.
								const cost = curr.match(/\d+/g);
								const prev = acc.match(/\d+/g);
								if (cost && prev) {
									return Number(cost[ 0 ]) + Number(prev[ 0 ]);
								}
								if (cost) return Number(cost[ 0 ]);
								return acc;
							})
							: unpaidMaintaince?.match(/\d+/g)?.[ 0 ],
					);
					const calculatedUnpaidWaterBill = Number(
						unpaidWaterBill.includes(',')
							? unpaidWaterBill
								?.toString()
								.split(',')
								.reduce((acc: any, curr: any) => {
									const cost = curr.match(/\d+/g);
									const prev = acc.match(/\d+/g);
									if (cost && prev) {
										return Number(cost[ 0 ]) + Number(prev[ 0 ]);
									}
									if (cost) return Number(cost[ 0 ]);
									return acc;
								})
							: unpaidWaterBill?.match(/\d+/g)?.[ 0 ],
					);

					const calculatedFined = Number(
						fined
							?.toString()
							.split(',')
							.reduce((acc: any, curr: any) => {
								const cost = curr.match(/\d+/g);
								const prev = acc.match(/\d+/g);
								if (cost && prev) {
									return Number(cost[ 0 ]) + Number(prev[ 0 ]);
								}
								if (cost) return Number(cost[ 0 ]);
								return acc;
							}),
					);
					const total =
						Math.round(((maintenanceCost || 0) +
							(calculatedFined || 0) +
							(calculatedUnpaidMaintaince || 0) +
							(isMeterClosed ? 300 : (Number(waterCost) * PER_UNIT_COST || 0)) +
							(calculatedUnpaidWaterBill || 0) + (Number(other) || 0)) / 10) * 10;
					const htmlObj = {
						billNo: billData[ 'SR No.' ],
						managementDate: billData[ 'Maintaince Period' ] || 'Not Applicable',
						date: parseSheetJSDate(billData[ 'Date' ]),
						memberName: billData[ 'Member Name' ],
						flatNo: billData[ 'Flat No' ],
						fixedCost: !isNaN(maintenanceCost) ? `${maintenanceCost}/-` : billData[ 'Maintaince' ],
						checkqueDueDate: parseSheetJSDate(billData[ 'Due Date' ]),
						unpaidFixedCost: unpaidMaintaince.split(',').join('<br>') || 0,
						fined: billData.fined?.toString().split(',').join('<br>') || 0,

						waterBill: billData[ 'Water Period' ],
						currentReading: billData[ 'Current Reading' ],
						previousReading: billData[ 'Previous Reading' ],
						unitsUsed: isMeterClosed ? 'Meter Closed' : waterCost,
						perUnitCost: `${PER_UNIT_COST}/-`,
						usedAmt: isMeterClosed ? `300/-` : `${Math.round((Number(waterCost) * PER_UNIT_COST) / 10) * 10}/-`,
						total: `${total}/-`,
						totalAmountInWords: towords(total),
						dueDate: parseSheetJSDate(billData[ 'Due Date' ]),
						other: billData[ 'other' ],
						chequeNo: billData[ 'Cheque No.' ],
						chequeDate: billData[ 'Cheque Date' ]
							? parseSheetJSDate(billData[ 'Cheque Date' ])
							: '',
						bank: billData[ 'Bank Name' ],
						branch: billData[ 'Branch' ],
						unpaidWaterBill: unpaidWaterBill.split(',').join('<br>') || 0,
					};

					Object.keys(htmlObj).forEach((key: any) => {
						htmlStr = htmlStr.replaceAll(
							`{{${key}}}`,
							(htmlObj as any)[ key ] || '',
						);
					});
					try {

						await withPage(browser, async (page) => {
							await page.setContent(htmlStr);
							await Bun.write(__dirname + `/pdfs/satya-${billData[ 'Flat No' ].replace('/', '_')}.pdf`,
								await page.pdf({
									format: 'A4',
									scale: 0.99,
								}));
						});
					}
					catch (e) {
						console.log(e);
					}
				}),
			);
			timeLogs.puppeteer = new Date().getTime() - startTime;
		}

		console.log(chalk.blueBright('PDFs Generated!'));
		// const files = fs.readdirSync(__dirname + '/pdfs');

		const files = fs.readdirSync(__dirname + '/pdfs');
		console.log(chalk.blueBright('Merging PDFs...'));
		const merger = new PDFMerger();
		for (let file of files) {
			await merger.add(__dirname + `/pdfs/${file}`);
		}
		console.log(chalk.blueBright('Merged!'));
		console.log(chalk.blueBright('Saving...'));
		await merger.save(__dirname + '/merged.pdf');
		timeLogs.merge = new Date().getTime() - timeLogs.puppeteer;
		console.log(chalk.blueBright('Saved!'));
		await rimraf(__dirname + '/pdfs', {}, (err) => {
			if (err) return console.log(err);
		});
		console.log(chalk.blueBright('Cleaned up!'));
		console.log(chalk.blueBright('Exiting...'));
		timeLogs.merge = new Date().getTime() - timeLogs.merge;
		const end_time = new Date().getTime();
		console.log(
			chalk.greenBright(
				`Total Time Taken: ${((end_time - start_time) / 1000).toFixed(2)}s`,
			),
		);
		console.log(`Puppeteer: ${timeLogs.puppeteer / 1000}s`);
		console.log(`Convert: ${timeLogs.convert / 1000}s`);
		console.log(`Merge: ${timeLogs.merge / 1000}s`);
	});
};
init();
