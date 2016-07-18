// first of all make sure we have enough arguments (exit if not)
if (process.argv.length != 7)
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
var inputSvcFile = process.argv[3];
var templateCommandFile = process.argv[4];
var templateMapFile = process.argv[5];
var templateControllerFile = process.argv[6];


// make sure each file is the right type (exit if not)
assert.ok(inputFile.lastIndexOf('csv') == (inputFile.length - 'csv'.length), "input file should be a .csv file");
assert.ok(inputSvcFile.lastIndexOf('csv') == (inputSvcFile.length - 'csv'.length), "input file should be a .csv file");
assert.ok(templateCommandFile.lastIndexOf('ejs') == (templateCommandFile.length - 'ejs'.length), "template file should be an .ejs file");
assert.ok(templateMapFile.lastIndexOf('ejs') == (templateMapFile.length - 'ejs'.length), "template file should be an .ejs file");
assert.ok(templateControllerFile.lastIndexOf('ejs') == (templateControllerFile.length - 'ejs'.length), "template file should be an .ejs file");

// make sure we use the correct line-endings on Windows
var EOL = (process.platform === 'win32' ? '\r\n' : '\n')
var TAB = '\t\t\t\t';
// build the template
var templateCommand = ejs.compile(fs.readFileSync(templateCommandFile, 'utf8'));
var templateMap = ejs.compile(fs.readFileSync(templateMapFile, 'utf8'));
var templateController = ejs.compile(fs.readFileSync(templateControllerFile, 'utf8'));

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

    if(typeof data['program'] === 'undefined' || data['program'] === null || data['program'] === '') {
        console.log("input file should include a PROGRAM name");
        return {};
    }

    event = {
        id: data['event_id'],
        label: data['label'],
        in: data['in'],
        out: data['out'],
        handler: data['event_handler']
    };

    return data;
})
.on('data',function(data,index){
    console.log('#'+index+' '+JSON.stringify(data));
    try {
        if(module != data['program']){
            prev_program = module;
            if(module != '')
                programs.push({program: module, events:events});

            console.log("New Command : " + data['program']);
            module = data['program'];
            events = [];
        }
        events.push(event);

    } catch (e) {
        console.error(e.stack)
    }
})
.on('end',function(count){
    programs.push({program: module, events:events});

    for(var i = 0; i< programs.length;i++){
        outLines.push(templateCommand(programs[i]));
        fs.writeFileSync('output/' + programs[i].program + '.command.js', outLines[i], 'utf8');
    }
    outLines = [];
    for(var i = 0; i< programs.length;i++){
        outLines.push(templateMap(programs[i]));
        fs.writeFileSync('output/' + programs[i].program + '.map.js', outLines[i], 'utf8');
    }
    
    console.log("done!");
})
.on('error',function(error){
    console.log(error.message);
});

prev_program = '';

var svces = [];
var svc = "";
var dtoes = [];

csv()
    .fromPath(inputSvcFile, { columns: true })
    .transform(function(data){

        if(typeof data['program'] === 'undefined' || data['program'] === null || data['program'] === '') {
            console.log("input file should include a PROGRAM name");
            return {};
        }

        dto = {
            in: data['in'],
            out: data['out']
        };

        return data;
    })
    .on('data',function(data,index){
        console.log('#'+index+' '+JSON.stringify(data));
        try {
            if(svc != data['program']){
                prev_program = svc;
                if(svc != '')
                    svces.push({program: svc, dtoes:dtoes});

                console.log("New Command : " + data['program']);
                svc = data['program'];
                dtoes = [];
            }
            dtoes.push(dto);

        } catch (e) {
            console.error(e.stack)
        }
    })
    .on('end',function(count){
        svces.push({program: svc, dtoes:dtoes});
        if(programs.length != svces.length) {
            console.log("dismatch with controller's id and services's id");
            return {};
        }
        outLines = [];
        for(var i = 0; i< programs.length;i++){
            programs[i].dtoes = svces[i].dtoes;
            outLines.push(templateController(programs[i]));
            fs.writeFileSync('output/' + programs[i].program + '.controller.js', outLines[i], 'utf8');
        }
      
        console.log("done!");
    })
    .on('error',function(error){
        console.log(error.message);
    });