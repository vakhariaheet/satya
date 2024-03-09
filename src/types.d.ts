export interface FlatInfo {
	created_on: string;
	flats: Flat[];
	last_updated: string;
}
export interface Flat {
	'Flat No': number;
	'Name ': string;
	Mobile: number;
	Email: string;
}
export interface ExcelBill {
	'SR No.': number;
	'Flat No': string;
	'Unpaid Maintaince': string;
	'Unpaid Water Bill': string;
	'Maintaince Period': string;
	'Maintaince': number;
	'Member Name': string;
	'Due Date': number;
	'Water Period': string;
	'Previous Reading': number;
	'Current Reading': number;
	other: string;
	fined: string;
	Date: number;
	'Cheque No.': string;
	'Bank Name': string;
	'Branch': string;
	'Cheque Date': number;
	'Use Unit': string | number;
}

