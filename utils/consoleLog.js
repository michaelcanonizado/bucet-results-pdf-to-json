export function consoleLog(str) {
	const strFormatLength = 60;

	let excessChar = null;

	if (str === '\n') {
		return console.log('\n');
	}
	if (str.length > strFormatLength) {
		str = [str.slice(0, strFormatLength), str.slice(strFormatLength)];

		consoleLog(str[0]);
		consoleLog(str[1]);
		return;
	}
	if (str.length < strFormatLength) {
		const remainingSpace = strFormatLength - str.length;

		for (let i = 0; i < remainingSpace; i++) {
			str += '.';
		}
	}
	return console.log(str);
}
