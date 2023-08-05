const startTime = performance.now();

import { convertAndFormatData } from './utils/pdfToJson.js';
import { joinFormattedData } from './utils/joinJsonData.js';

import fs, { write } from 'fs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

async function getFilesAndDirectories(dir) {
	return new Promise((resolve, reject) => {
		fs.readdir(dir, (err, folders) => {
			if (err) return err;

			resolve(folders);
		});
	});
}

async function recurseCampuses(dirInput, dirOutput) {
	console.log('READING....');
	console.log('\n', '\n');

	const campuses = await getFilesAndDirectories(dirInput);

	for (const campus of campuses) {
		const courseCodes = await getFilesAndDirectories(`${dirInput}/${campus}`);

		for (const courseCode of courseCodes) {
			await convertAndFormatData(dirInput, dirOutput, campus, courseCode);
		}
	}

	await joinFormattedData(dirOutput, './_2023_2024_BUCET_RESULTS');

	const endTime = performance.now();
	console.log('\n', '\n');
	console.log(
		`----------------Elapsed Time: ${(endTime - startTime).toFixed(
			3
		)} ms---------------`
	);
	console.log(
		`-----------------Elapsed Time: ${((endTime - startTime) / 1000).toFixed(
			3
		)} s-----------------`
	);

	console.log('\n', '\n');
	rl.close();
}

recurseCampuses('./data-pdf', './data-formatted-json');
