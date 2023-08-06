import fs from 'fs';

import { consoleLog } from './consoleLog.js';

const BUCET_RESULTS_2023_2024 = {
	'university-name': 'Bicol University',
	'school-year': '2023-2024',
	data: [],
};

async function getFilesAndDirectories(dir) {
	return new Promise((resolve, reject) => {
		fs.readdir(dir, (err, folders) => {
			if (err) return err;

			resolve(folders);
		});
	});
}

async function joinJsonData(dir) {
	await fs.readFile(dir, 'utf8', (err, data) => {
		if (err) return err;

		BUCET_RESULTS_2023_2024.data.push(...JSON.parse(data));
	});
}

export async function joinFormattedData(dirInput, dirOutput) {
	consoleLog('\n', '\n');
	consoleLog(`joining all converted JSON data into one JSON Object`);

	const campuses = await getFilesAndDirectories(dirInput);

	for (const campus of campuses) {
		const courseCodes = await getFilesAndDirectories(`${dirInput}/${campus}`);

		for (const courseCode of courseCodes) {
			const dir = `${dirInput}/${campus}/${courseCode}`;
			await joinJsonData(dir);
		}
	}

	await fs.writeFile(
		`${dirOutput}.json`,
		JSON.stringify(BUCET_RESULTS_2023_2024),
		(err) => {
			if (err) {
				return err;
			}
		}
	);
	consoleLog(
		`done joining converted JSON data into one JSON Object: ${dirOutput}`
	);
}
