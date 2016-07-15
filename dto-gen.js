// first of all make sure we have enough arguments (exit if not)
if (process.argv.length != 4)
{
    console.error("Usage: node csv2html.js input.csv template.ejs output.html")
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
var templateFile = process.argv[3];


// make sure each file is the right type (exit if not)
assert.ok(inputFile.lastIndexOf('csv') == (inputFile.length - 'csv'.length), "input file should be a .csv file");
assert.ok(templateFile.lastIndexOf('ejs') == (templateFile.length - 'ejs'.length), "template file should be an .ejs file");

// make sure we use the correct line-endings on Windows
var EOL = (process.platform === 'win32' ? '\r\n' : '\n')
var TAB = '\t\t\t\t';
// build the template
var template = ejs.compile(fs.readFileSync(templateFile, 'utf8'))

// make an array to store our output
var outLines = [];
var dtoes = [];
var section1 = [];
var section2 = [];
var section3 = [];
var module = "";
var prev_data = null;
var prev_dto = "";
var current_dto = "";

csv()
.fromPath(inputFile, { columns: true })
.transform(function(data){
    // optional transform step, e.g.
    //data['Year'] = new Date(data['Date']).getUTCFullYear();
    if(module === '') {
        
        if(typeof data['program'] === 'undefined' || data['program'] === null || data['program'] === '') {
            console.log("input file should include a PROGRAM name");
            return {};
        } else {
            module = data['program'];
            console.log("Module : " + data['program']);
        }
        
    }
    
    if (typeof data['dto'] === 'undefined' || data['dto'] === null || data['dto'] === '') {
        data['dto'] = current_dto;
    } else {
        console.log("New DTO : " + data['dto']);
        prev_dto = current_dto;
        prev_data = {
            dto: prev_dto,
            module: module,
            section1: section1.join(',' + EOL + TAB),
            section2: section2.join(EOL+ TAB),
            section3: section3.join(',' + EOL + TAB)
        };
        current_dto = data['dto'];
        section1 = [];
        section2 = [];
        section3 = [];

    }
    

    section1.push(data['property']);
    section2.push('this.' + data['property'] + ' = ' +  data['property'] + ';');
    section3.push('data.' + data['property'] );

    return data;
})
.on('data',function(data,index){
    console.log('#'+index+' '+JSON.stringify(data));
    try {
        if(prev_dto != '' &&  prev_dto != current_dto){
             dtoes.push(prev_data);
             outLines.push(template(prev_data));
        }
    } catch (e) {
        console.error(e.stack)
    }
})
.on('end',function(count){
    for(var i = 0; i< dtoes.length;i++){
        fs.writeFileSync('output/' + dtoes[i].dto + '.model.js', outLines[i], 'utf8');
    }
    console.log("done!");
})
.on('error',function(error){
    console.log(error.message);
});