const startTime = performance.now();

import { dir } from 'console';
import fs from 'fs';
import { join } from 'path';

const _2023_2024_BUCET_RESULTS = {
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

		_2023_2024_BUCET_RESULTS.data.push(...JSON.parse(data));
	});
}

export async function joinFormattedData(dirInput, dirOutput) {
	console.log('\n', '\n');
	console.log('JOINING DATA INTO ONE FILE.....');

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
		JSON.stringify(_2023_2024_BUCET_RESULTS),
		(err) => {
			if (err) {
				return err;
			}
		}
	);
	console.log('DONE JOINING DATA INTO ONE FILE......');
}

// joinFormattedData('./data-formatted-json', './_2023_2024_BUCET_RESULTS');
