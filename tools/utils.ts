export function loadJSONFile(fileName: string): { [k: string]: any } | null {
    let data: { [k: string]: any } | null = null;
  
    try {
      data = require(fileName);
    } catch (err) {
      // console.log(
      //   chalk.bgRed.bold('   ERROR   ') + ` Couldn't load file ${fileName}`
      // );
      console.log(`{bold {bgRed    ERROR   } Couldn't load file ${fileName}}`);
    }
  
    return data;
  }
  