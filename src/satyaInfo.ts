#!/usr/bin/env node

import inquirer, { QuestionCollection } from 'inquirer';
import moment from 'moment';
import chalk from 'chalk';
import fs from 'fs';
import XLSX from 'xlsx';
import rimraf from 'rimraf';
const questions: QuestionCollection[] = [
	{
		type: 'list',
		name: 'operation',
		message: 'What do you want to do?',
		choices: [
			{
				name: 'Update the data',
				value: 'update',
			},
			{
				name: 'Add a new entry',
				value: 'add',
			},
			{
				name: 'Delete an entry',
				value: 'delete',
			},
			{
				name: 'Display the data',
				value: 'display',
			},
		],
		default: 'update',
	},
	{
		type: 'input',
		name: 'filename',
		message: "What's the name of the file?",
		default: 'satya-info.xlsx',
		when: (answers) => answers.operation === 'update',
	},
	{
		type: 'input',
		name: 'flatNumber',
		message: "What's the flat number?",
		when: (answers) =>
			answers.operation === 'add' || answers.operation === 'delete',
	},
	{
		type: 'input',
		name: 'name',
		message: "What's the name of the flat owner?",
		when: (answers) => answers.operation === 'add',
		validate: (answer) => {
			if (answer === '') {
				return 'You must enter a name';
			}
			return true;
		},
	},
	{
		type: 'input',
		name: 'mobile',
		message: "What's the mobile number of the flat owner?",
		when: (answers) => answers.operation === 'add',
		validate: (answer) => {
			if (answer === '') {
				return 'You must enter a name';
			}
			return true;
		},
	},
	{
		type: 'input',
		name: 'email',
		message: "What's the email of the flat owner?",
		when: (answers) => answers.operation === 'add',
		validate: (answer) => {
			if (answer === '') {
				return 'You must enter a name';
			}
			return true;
		},
	},
];
const init = async () => {
	const prompt = inquirer.createPromptModule();
	const answers = await prompt(questions);
	const { operation } = answers;
	if (operation === 'update') {
		const { filename } = answers;
		const workbook = XLSX.readFile(`./${filename}`);
		const sheet_name_list = workbook.SheetNames;
		const xlData = XLSX.utils.sheet_to_json(
			workbook.Sheets[sheet_name_list[0]],
		);
		const flatInfo = {
			created_on: moment().format('DD/MM/YYYY'),
			flats: xlData,
			last_updated: moment().format('DD/MM/YYYY'),
		};
		fs.writeFileSync(__dirname + '/flatInfo.json', JSON.stringify(flatInfo));
	} else if (operation === 'add') {
		const { flatNumber, name, mobile, email } = answers;
		const flatInfo = JSON.parse(
			fs.readFileSync(__dirname + '/flatInfo.json', 'utf8'),
		);
		flatInfo.flats.push({
			flatNumber,
			name,
			mobile,
			email,
		});
		flatInfo.last_updated = moment().format('DD/MM/YYYY');
		fs.writeFileSync(__dirname + '/flatInfo.json', JSON.stringify(flatInfo));
	} else if (operation === 'delete') {
		const { flatNumber } = answers;

		const flatInfo = JSON.parse(
			await fs.readFileSync(__dirname + '/flatInfo.json', 'utf8'),
		);
		flatInfo.flats = flatInfo.flats.filter(
			(flat: { flatNumber: number }) => flat.flatNumber !== Number(flatNumber),
		);
		flatInfo.last_updated = moment().format('DD/MM/YYYY');

		await fs.writeFileSync(
			__dirname + '/flatInfo.json',
			JSON.stringify(flatInfo),
		);
	} else if (operation === 'display') {
		const flatInfo = JSON.parse(
			fs.readFileSync(__dirname + '/flatInfo.json', 'utf8'),
		);
		console.log(chalk.green('Created on: ' + flatInfo.created_on));
		console.log(chalk.green('Last updated: ' + flatInfo.last_updated));
		console.table(flatInfo.flats);
	}
};
init();
