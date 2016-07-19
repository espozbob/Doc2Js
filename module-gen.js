/**
 * Usage: >node.exe module-gen.js csv/module.csv template/module.template.ejs template/topmodule.template.ejs template/topmodule.head.ejs
 */
// first of all make sure we have enough arguments (exit if not)
if (process.argv.length != 6)
{
    console.error("Usage: node command-gen.js csv/command.csv template/command.template.ejs")
    console.error();
    console.error("Outputs the given template for each row in the given input.")
    console.error("Uses the first row of the CSV as column names in the template.")
    process.exit(1);
}

// now load the modules we need
var csv = require('csv'),       // library for processing CSV spreadsheet files
    ejs = require('ejs'),       // library for turning .ejs templates into .html files
    fs = require('fs'),         // node.js library for reading and writing files
    assert = require('assert'); // node.js library for testing for error conditions

// make sure EJS is configured to use curly braces for templates
ejs.open = '{{';
ejs.close = '}}';

// grab the file names from the command arguments array
// and give them more convenient names
var inputFile = process.argv[2];
var templateModuleFile = process.argv[3];
var templateTopFile = process.argv[4];
var templateHeadFile = process.argv[5];


// make sure each file is the right type (exit if not)
assert.ok(inputFile.lastIndexOf('csv') == (inputFile.length - 'csv'.length), "input file should be a .csv file");
assert.ok(templateModuleFile.lastIndexOf('ejs') == (templateModuleFile.length - 'ejs'.length), "template file should be an .ejs file");
assert.ok(templateTopFile.lastIndexOf('ejs') == (templateTopFile.length - 'ejs'.length), "template file should be an .ejs file");
assert.ok(templateHeadFile.lastIndexOf('ejs') == (templateHeadFile.length - 'ejs'.length), "template file should be an .ejs file");

// make sure we use the correct line-endings on Windows
var EOL = (process.platform === 'win32' ? '\r\n' : '\n')
var TAB = '\t\t\t\t';
// build the template
var templateModule = ejs.compile(fs.readFileSync(templateModuleFile, 'utf8'));
var templateTop = ejs.compile(fs.readFileSync(templateTopFile, 'utf8'));
var templateHead = ejs.compile(fs.readFileSync(templateHeadFile, 'utf8'));

// make an array to store our output
var outLines = [];
var programs = [];
var events = [];

var module = "";
var event = null;
var prev_program = "";


csv()
.fromPath(inputFile, { columns: true })
.transform(function(data){
    // optional transform step, e.g.
    //data['Year'] = new Date(data['Date']).getUTCFullYear();

    if(typeof data['ID'] === 'undefined' || data['ID'] === null || data['ID'] === '') {
        console.log("input file should include a PROGRAM name");
        return {};
    }

    event = {
        program: data['ID'],
        code2: String(data['code2']||'').toLowerCase(),
        code3: String(data['code3']||'').toLowerCase(),
        topurl: String(data['URL']).split("/", String(data['URL']).split("/").length-1).join('/'),
        url: data['URL'],
        name: data['Name'],
        desc: data['Description']
    };

    return data;
})
.on('data',function(data,index){
    console.log('#'+index+' '+JSON.stringify(data));
    try {
        if(module != data['code2']){
            prev_program = module;
            if(module != '')
                programs.push({program: module, submodules:events});

            console.log("New Module : " + data['code2']);
            module = data['code2'];
            events = [];
        }
        events.push(event);

    } catch (e) {
        console.error(e.stack)
    }
})
.on('end',function(count){
    programs.push({program: module, submodules:events});

    for(var i = 0; i< programs.length;i++){
        fs.writeFileSync('output/' + programs[i].program + '.module.js', templateTop(programs[i]), 'utf8');
        for(var j = 0; j< programs[i].submodules.length;j++) {
            outLines.push(templateModule(programs[i].submodules[j]));
            fs.writeFileSync('output/' + programs[i].submodules[j].program + '.module.js', outLines[i], 'utf8');
        }
    }
    fs.writeFileSync('output/topmodule.head.js', templateHead({programs:programs}), 'utf8');

    
    console.log("done!");
})
.on('error',function(error){
    console.log(error.message);
});
