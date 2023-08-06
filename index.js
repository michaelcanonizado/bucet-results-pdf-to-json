const startTime = performance.now();

import { convertAndFormatData } from './utils/pdfToJson.js';
import { joinFormattedData } from './utils/joinJsonData.js';

import fs, { write } from 'fs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { consoleLog } from './utils/consoleLog.js';

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
	consoleLog('READING');
	consoleLog('\n', '\n');

	const campuses = await getFilesAndDirectories(dirInput);

	for (const campus of campuses) {
		const courseCodes = await getFilesAndDirectories(`${dirInput}/${campus}`);

		for (const courseCode of courseCodes) {
			await convertAndFormatData(dirInput, dirOutput, campus, courseCode);
		}
	}

	await joinFormattedData(dirOutput, './BUCET_RESULTS_2023_2024');

	const endTime = performance.now();
	consoleLog('\n', '\n');
	consoleLog(`Elapsed Time: ${(endTime - startTime).toFixed(3)}ms`);
	consoleLog(`Elapsed Time: ${((endTime - startTime) / 1000).toFixed(3)}s`);

	consoleLog('\n', '\n');
	rl.close();
}

recurseCampuses('./data-pdf', './data-formatted-json');
