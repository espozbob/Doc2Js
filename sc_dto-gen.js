/**
 * Usage: >node.exe sc_dto-gen.js csv/sc_dto.csv template/sc_dto.template.ejs template/sc_dto.head.ejs
 */
// first of all make sure we have enough arguments (exit if not)
if (process.argv.length != 5)
{
    console.error("Usage: node dto-gen.js csv/dto.csv template/dto.template.ejs")
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
var templateHeadFile = process.argv[4];


// make sure each file is the right type (exit if not)
assert.ok(inputFile.lastIndexOf('csv') == (inputFile.length - 'csv'.length), "input file should be a .csv file");
assert.ok(templateFile.lastIndexOf('ejs') == (templateFile.length - 'ejs'.length), "template file should be an .ejs file");
assert.ok(templateHeadFile.lastIndexOf('ejs') == (templateHeadFile.length - 'ejs'.length), "template file should be an .ejs file");

// make sure we use the correct line-endings on Windows
var EOL = (process.platform === 'win32' ? '\r\n' : '\n')
var TAB = '\t\t\t\t';
// build the template
var template = ejs.compile(fs.readFileSync(templateFile, 'utf8'))
var templateHead = ejs.compile(fs.readFileSync(templateHeadFile, 'utf8'))

// make an array to store our output
var outLines = [];
var outHeadLines = [];
var dtoes = [];
var services = [];
var descs = [];
var section1 = [];
var section2 = [];
var section3 = [];
var section4 = [];
var injections = [];
var fncInject = [];

var module = "";
var prev_data = null;
var prev_dto = "";
var prev_desc = "";
var current_dto = "";
var current_desc = "";
var isNew = false;

csv()
.fromPath(inputFile, { columns: true })
.transform(function(data){
    // optional transform step, e.g.
    //data['Year'] = new Date(data['Date']).getUTCFullYear();
    if(module === '') {
        
        if(typeof data['program'] === 'undefined' || data['program'] === null || data['program'] === '') {
            console.log("input file should include a PROGRAM name");
            throw new Error("input file should include a PROGRAM name");
        } else {
            module = data['program'];
            console.log("Module : " + data['program']);
        }
        
    }

    if (typeof data['dto'] === 'undefined' || data['dto'] === null || data['dto'] === '') {
        data['dto'] = current_dto;
        data['property_hname'] = current_desc;
    } else {
        isNew = true;
        console.log("New DTO : " + data['dto']);
        prev_dto = current_dto;
        prev_desc = current_desc;
        prev_data = {
            dto: prev_dto,
            code2:module.substring(0,3),
            desc: prev_desc,
            module: prev_dto.substring(0,11),
            injections: injections.join(', '),
            fncInject: fncInject.join(', '),
            services: ".service('" + prev_dto + "', " +prev_dto +')',
            section1: section1.join(EOL + '        '),
            section2: section2.join(EOL+ '            '),
            section3: section3.join( EOL + TAB),
            section4: section4.join(',' + EOL + TAB)
        };
        current_dto = data['dto'];
        current_desc = data['property_hname'];
        services = [];
        section1 = [];
        section2 = [];
        fncInject =[];
        injections =[];
        section3 = [];
        section4 = [];

    }
    services.push(".service('" + data['dto'] + "', " + data['dto'] +')' );
    if(String(data['type']).substring(0,4) === 'List') {
        section1.push('vm.' + data['property'] + ' = [];');
    }else {
        section1.push('vm.' + data['property'] + ' = "";');
    }
    
    section2.push('get' + String(data['property']).charAt(0).toUpperCase() + String(data['property']).slice(1) + ' : function(){ return vm.' +  data['property'] + ';},');
    
    section4.push(data['property'] + ' : vm.' +  data['property'] );    //getData
    if(data['dto_name'] === 'DTO') {
        if(String(data['type']).substring(0,4) === 'List') {
            fncInject.push(String(data['type']).substring(5,String(data['type']).length-1));
            injections.push('"'+String(data['type']).substring(5,String(data['type']).length-1) + '"' );
            section3.push('vm.' + data['property'] + ' = [];' + EOL + TAB +'angular.forEach(response.'+ data['property'] +', function(item) {' + EOL + TAB + '    tmp = '+ String(data['type']).substring(5,String(data['type']).length-1) +'.build(item);' + EOL + TAB + '    vm.'+ data['property'] +'.push(tmp);' + EOL +TAB +'});');
        }else {
            fncInject.push(data['type']);
            injections.push('"'+ data['type'] + '"' );
            section3.push('vm.' + data['property'] + ' = ' + data['type'] + '.build(response.' +  data['property'] + ');');   //build
        }
    }else {
        section3.push('vm.' + data['property'] + ' = response.' +  data['property'] + ';');   //build
    }


    return data;
})
.on('data',function(data,index){

    try {
        if(prev_dto != '' &&  prev_dto != current_dto && isNew){
             dtoes.push(prev_data);
             outLines.push(template(prev_data));
            isNew = false;
            console.log('#'+index+' '+JSON.stringify(data));
        }
    } catch (e) {
        console.error(e.stack)
    }
})
.on('end',function(count){
    dtoes.push(prev_data);
    outLines.push(template(prev_data));
     //dtoes.sort(function(a,b) {return (a.dto > b.dto) ? 1 : ((b.dto > a.dto) ? -1 : 0);} );
    for(var i = 0; i< dtoes.length;i++){
        console.error(dtoes[i].dto);
        fs.writeFileSync('output/' + dtoes[i].dto + '.model.js', outLines[i], 'utf8');
    }
    fs.writeFileSync('output/dto.head.js', templateHead({dtoes:dtoes}), 'utf8');
    console.log("done!");
})
.on('error',function(error){
    console.log(error.message);
});