
function appendJson(str, count) {
	var retStr = "\n";
	for (var i = 0; i < count; i++) {
		retStr += str;
	}
	return retStr;
}
function formartJson(oldJson) {
	var i = 0;
	var space = "  ";
	var formatJson = "";
	var indentCount = 0;
	var isStr = false;
	var currChar = "";
	
	for (i = 0; i < oldJson.length; i++) {
		currChar = oldJson.charAt(i);
		switch (currChar) {
			case '{':
			case '[':
				if (!isStr) {
					indentCount++;
					formatJson += currChar + appendJson(space, indentCount);
				} else {
					formatJson += currChar;
				}
				break;
			case '}':
			case ']':
				if (!isStr) {
					indentCount--;
					formatJson += appendJson(space, indentCount) + currChar;
				} else {
					formatJson += currChar;
				}
				break;
			case ',':
				if (!isStr) {
					formatJson += "," + appendJson(space, indentCount);
				} else {
					formatJson += currChar;
				}
				break;
			case ':':
				if (!isStr) {
					formatJson += ": ";
				} else {
					formatJson += currChar;
				}
				break;
			case ' ':
			case '\n':
			case '\t':
				if (isStr) {
					formatJson += currChar;
				}
				break;
			case '"':
				if (i > 0 && oldJson.charAt(i - 1) !== '\\') {
					isStr = !isStr;
				}
				formatJson += currChar;
				break;
			default:
				formatJson += currChar;
				break;
		}
	}
	return formatJson;
}