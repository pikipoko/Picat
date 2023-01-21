const spawn = require('child_process').spawn;
const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function isBlur(url) {
  try {
    const { stdout, stderr } = await exec(`python3 ./config/laplacian_var.py ${url}`);
    if (parseInt(stdout.toString()) > 100) {
      console.log(parseInt(stdout.toString()))
      return false;
    } else {
      console.log(parseInt(stdout.toString()))
      return true;
    }
  } catch (err) {
    console.error(err);
  }
}

module.exports = {isBlur}