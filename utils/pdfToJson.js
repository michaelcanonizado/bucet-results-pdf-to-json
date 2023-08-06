import { PdfReader } from 'pdfreader';
import fs from 'fs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { consoleLog } from './consoleLog.js';

const rl = readline.createInterface({ input, output });

let data = [];

function parsePdf(dirInput, CAMPUS_ABV, COURSE_NUMBER) {
	let pageData = {};
	consoleLog(`scanning ${CAMPUS_ABV}: ${COURSE_NUMBER}`);
	consoleLog('');
	return new Promise(function (resolve, reject) {
		new PdfReader().parseFileItems(dirInput, (err, item) => {
			if (err) {
				console.log(err);
				reject(err);
			} else if (!item) {
				consoleLog('end of file');
				consoleLog(
					`done converting ${CAMPUS_ABV}: ${COURSE_NUMBER} to JSON`
				);
				consoleLog('');
				reject(err);
			} else if (item.page) {
				pageData = {};
				data.push(pageData);

				consoleLog(
					`done converting ${CAMPUS_ABV}: ${COURSE_NUMBER}, page ${item.page} to JSON`
				);

				resolve();
			} else if (item.text) {
				(pageData[item.y] = pageData[item.y] || []).push(item.text);

				resolve();
			}
		});
	});
}

function sortObjectKeys(data) {
	return data.map((dataPage) => {
		const sortedObj = Object.keys(dataPage)
			.sort((a, b) => {
				return parseFloat(a) - parseFloat(b);
			})
			.reduce((obj, key) => {
				obj[key] = dataPage[key];
				return obj;
			}, {});

		return sortedObj;
	});
}

async function formatStudentData(data, CAMPUS_ABV, COURSE_NUMBER) {
	const studentsFormattedData = [];

	// Course and Campus are declared here, not in the for of loop to prevent resetting every new page.
	let studentCourse = null;
	let studentCampus = null;

	for (const page of data) {
		let studentStatus = null;

		// Search whole doc for Course and Campus
		for (const row in page) {
			if (studentCourse === null) {
				const str = page[row][0].toUpperCase().trim();
				if (
					str.includes('BACHELOR') ||
					str.includes('BTVTED') ||
					str.includes('BSBA') ||
					str.includes('DOCTOR')
				) {
					studentCourse = page[row][0];
					consoleLog('retrived course from converted JSON');
				}
			}
			if (studentCampus === null) {
				const str = page[row][0].toUpperCase().trim();
				if (
					str.includes('COLLEGE') ||
					str.includes('INSTITUTE') ||
					str.includes('BU ')
				) {
					studentCampus = page[row][0];
					consoleLog('retrived campus from converted JSON');
				}
			}
			if (studentStatus === null) {
				if (page[row][0].toUpperCase().trim() === 'QUALIFIED') {
					studentStatus = 'QUALIFIED';
				}
				if (page[row][0].toUpperCase().trim() === 'WAITLISTED') {
					studentStatus = 'WAITLISTED';
				}
			}
		}

		// If no Course or Campus are found, prompt user to manually set one
		if (studentCourse === null || undefined) {
			studentCourse = await rl.question(
				`Course not found for: ${CAMPUS_ABV}: ${COURSE_NUMBER} | Please Manually Enter: `
			);
			consoleLog('retrived course from converted JSON');
		}
		if (studentCampus === null || undefined) {
			studentCourse = await rl.question(
				`Campus not found for: ${CAMPUS_ABV}: ${COURSE_NUMBER} | Please Manually Enter: `
			);
			consoleLog('retrived campus from converted JSON');
		}

		// Format all retrived data into Student Object
		for (const row in page) {
			if (!isNaN(parseFloat(page[row]))) {
				if (page[row].length >= 9) {
					if (page[row].length === 9) {
						studentsFormattedData.push({
							rank: page[row][0].trim(),
							lastName: page[row][1].trim(),
							firstName: page[row][2].trim(),
							middleName: page[row][3].trim(),
							city: page[row][4].trim(),
							province: page[row][5].trim(),
							school: page[row][6].trim(),
							compositeRating: page[row][7].trim(),
							percentileRank: page[row][8].trim(),
							status: studentStatus,
							course: studentCourse,
							campus: [studentCampus, CAMPUS_ABV],
						});
					} else {
						studentsFormattedData.push({
							rank: page[row][0].trim(),
							lastName: page[row][1].trim() || '',
							firstName: page[row][2].trim(),
							middleName: ' ',
							city: page[row][3].trim(),
							province: page[row][4].trim(),
							school: page[row][5].trim(),
							compositeRating: page[row][6].trim(),
							percentileRank: page[row][7].trim(),
							status: studentStatus.trim(),
							course: studentCourse.trim(),
							campus: [studentCampus.trim(), CAMPUS_ABV.trim()],
						});
						// consoleLog('ERROR');
						// consoleLog(error);
						// consoleLog(page);
					}
				}
			}
		}
	}

	consoleLog('');
	consoleLog('done formating converted JSON');
	consoleLog('');

	return studentsFormattedData;
}

async function writeData(dir, course, data) {
	consoleLog(`writing files to: ${dir}`);
	if (!fs.existsSync(dir)) {
		consoleLog(`${dir} not found`);
		consoleLog(`creating /${dir}`);
		fs.mkdirSync(dir, { recursive: true });
	}
	await fs.writeFile(
		`${dir}/${course.replace('.pdf', '.json')}`,
		JSON.stringify(data),
		(err) => {
			if (err) {
				return err;
			}
		}
	);

	return consoleLog(
		`done writing data to: ${dir}/${course.replace('.pdf', '.json')}`
	);
}

export async function convertAndFormatData(
	dirInput,
	dirOutput,
	CAMPUS_ABV,
	COURSE_NUMBER
) {
	await parsePdf(
		`${dirInput}/${CAMPUS_ABV}/${COURSE_NUMBER}`,
		CAMPUS_ABV,
		COURSE_NUMBER
	);

	const sortedData = sortObjectKeys(data);

	const studentsFormattedData = await formatStudentData(
		sortedData,
		CAMPUS_ABV,
		COURSE_NUMBER
	);

	await writeData(
		`${dirOutput}/${CAMPUS_ABV}`,
		COURSE_NUMBER,
		studentsFormattedData
	);

	data = [];

	consoleLog(
		`number of students for ${CAMPUS_ABV}: ${COURSE_NUMBER.replace(
			'.pdf',
			'.json'
		)}: ${studentsFormattedData.length}`
	);
}
