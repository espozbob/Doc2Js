/**
 * Usage: >node.exe sc-gen.js csv/sc.csv template/sc.template.ejs template/sc.head.ejs
 */
// first of all make sure we have enough arguments (exit if not)
if (process.argv.length != 5)
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
var templateHeadFile = process.argv[4];


// make sure each file is the right type (exit if not)
assert.ok(inputFile.lastIndexOf('csv') == (inputFile.length - 'csv'.length), "input file should be a .csv file");
assert.ok(templateModuleFile.lastIndexOf('ejs') == (templateModuleFile.length - 'ejs'.length), "template file should be an .ejs file");
assert.ok(templateHeadFile.lastIndexOf('ejs') == (templateHeadFile.length - 'ejs'.length), "template file should be an .ejs file");

// make sure we use the correct line-endings on Windows
var EOL = (process.platform === 'win32' ? '\r\n' : '\n')
var TAB = '\t\t\t\t';
// build the template
var templateModule = ejs.compile(fs.readFileSync(templateModuleFile, 'utf8'));
var templateHead = ejs.compile(fs.readFileSync(templateHeadFile, 'utf8'));

// make an array to store our output
var outLines = [];
var programs = [];
var services = [];

var module = "";
var service = null;
var prev_program = "";


csv()
.fromPath(inputFile, { columns: true })
.transform(function(data){
    // optional transform step, e.g.
    //data['Year'] = new Date(data['Date']).getUTCFullYear();

    if(typeof data['method'] === 'undefined' || data['method'] === null || data['method'] === '') {
        console.log("input file should include a method name");
        throw new Error("input file should include a method name");
    }
    // if(typeof data['v3_api'] === 'undefined' || data['v3_api'] === null || data['v3_api'] === '') {
    //     console.log("input file should include a api url");
    //      throw new Error("input file should include a api url");
    // }
    service = {
        program: data['class'],
        method:  data['method'],
        method_name: data['method_name'], 
        in:data['in'], 
        in_name:data['in_name'], 
        out:data['out'], 
        out_name:data['out_name'], 
        v3_method:data['v3_method'], 
        v3_api:data['v3_api']
    };

    return data;
})
.on('data',function(data,index){
    console.log('#'+index+' '+JSON.stringify(data));
    try {
        if(module != data['class'] &&  data['class']  != null){
            prev_program = module;
            if(module != null && module != '')
                programs.push({program: module, code2:module.substring(1,4), services:services});

            console.log("New Module : " + data['class']);
            module = data['class'];
            console.log('*' + module);
            services = [];
        }
        services.push(service);

    } catch (e) {
        console.error(e.stack)
    }
})
.on('end',function(count){
    console.log('*' + module);
    programs.push({program: module, code2:module.substring(1,4), services:services});

    for(var i = 0; i< programs.length;i++){
       
            fs.writeFileSync('output/' + programs[i].program + '.service.js', templateModule(programs[i]), 'utf8');
      
    }
    fs.writeFileSync('output/sc.head.js', templateHead({programs:programs}), 'utf8');

    
    console.log("done!");
})
.on('error',function(error){
    console.log(error.message);
});
