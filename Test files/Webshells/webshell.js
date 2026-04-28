const childProcess = require('child_process');

function executeCmd(cmd) {
    try {
        const result = childProcess.execSync(cmd);
        console.log(result.toString());
    } catch (error) {
        console.error("Error ejecutando comando: " + error.message);
    }
}

executeCmd(process.argv[2]);
