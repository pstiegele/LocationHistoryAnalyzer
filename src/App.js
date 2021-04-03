import logo from './logo.svg';
import './App.css';
import { Component } from 'react';
import { XYPlot, XAxis, YAxis, HorizontalGridLines, VerticalBarSeries } from 'react-vis';
import '../node_modules/react-vis/dist/style.css';
import Moment from 'react-moment';
var fileReaderStream = require('filereader-stream')
let JSONStream = require('JSONStream')
const pointInPolygon = require('point-in-polygon');


let boxes = [
  {
    id: 0,
    name: "Koblenz",
    counter: 0,
    polygon: [[7.435220, 50.423536], [7.435220, 50.280122], [7.734369, 50.280122], [7.734369, 50.423536]]
  },
  {
    id: 1,
    name: "Siershahn",
    counter: 0,
    polygon: [[7.758799, 50.492634], [7.758799, 50.475704], [7.798281, 50.475704], [7.798281, 50.492634]]
  },
  {
    id: 2,
    name: "Würzburg",
    counter: 0,
    polygon: [[9.778645, 49.870491], [9.778645, 49.704988, 0.0], [10.138905, 49.704988], [10.138905, 49.870491]]
  },
  {
    id: 3,
    name: "Darmstadt",
    counter: 0,
    polygon: [[8.516991, 49.939050], [8.516991, 49.795948], [8.772423, 49.795948], [8.772423, 49.939050]]
  },
];
let dates = [];


class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      percentageFileRead: 0,
      chartData: [],
      estimatedRemainingDuration: 0
    }

    this.addMatchedBoxesToState = this.addMatchedBoxesToState.bind(this);
    this.getCountsPerBox = this.getCountsPerBox.bind(this);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} width="100px" className="App-logo" alt="logo" />
        </header>
        <p>
          <input type="file" name="file" onChange={this.onChangeHandler} />
          <button name="Show" onClick={this.showButtonHandler}>Show</button>
        </p>
        <XYPlot
          width={400}
          height={300}
          xType="ordinal">

          <HorizontalGridLines />
          <VerticalBarSeries
            data={this.state.chartData} />
          <XAxis />
          <YAxis />
        </XYPlot>

        <h1>{Math.round(this.state.percentageFileRead * 10000) / 100} %</h1>
          Latest Date processed:<h2> {this.state.latestDateProcessed}</h2>
          estimated remaining duration: <b><Moment durationFromNow>{Date.now() - this.state.estimatedRemainingDuration}</Moment></b>

      </div>
    );
  }

  showButtonHandler() {
    this.getCountsPerBox();
    this.showChart();
  }

  showChart() {
    let chartData = [];
    boxes.forEach(box => {
      chartData.push({ x: box.name, y: box.counter });
    });
    this.setState({
      chartData: chartData
    });
    console.log(dates);
    console.log(chartData);
  }

  getCountsPerBox() {
    dates.forEach(date => {
      //if ((parseInt(date.date.substring(0, 4)) === 2014 && parseInt(date.date.substring(5, 7)) > 9) || parseInt(date.date.substring(0, 4)) > 2014) {
      let boxesMatched = date.boxesMatched;
      //if (boxesMatched.length === 0) {
      //  noBoxOnThisDayCounter++;
      // }
      boxesMatched.forEach(boxMatched => {
        let boxesBox = boxes.find(box => box.id === boxMatched);
        boxesBox.counter++;
      });
      //}
    });

  }

  onChangeHandler = event => {
    this.setState({
      selectedFile: event.target.files[0],
      loaded: 0,
    })
    this.initLocationParser(event.target.files[0]);
  }

  async initLocationParser(file) {
    let filesize = file?.size;
    let alreadyRead = 0;
    let start = new Date();
    let parser = JSONStream.parse(['locations', true]);
    parser.on('data', (locationEntry) => {
      this.analyzeLocationEntry(locationEntry);
    });

    parser.on('end', () => {
      this.showButtonHandler();
    })


    var stream = fileReaderStream(file, {chunkSize: 8*1024})
    stream.on('data', (data) => {
      alreadyRead += data.length;
      let percentageFileRead = alreadyRead / filesize;
      let duration = new Date() - start;
      let estimatedRemainingDuration = duration / percentageFileRead;

      this.setState({
        percentageFileRead: percentageFileRead,
        estimatedRemainingDuration: estimatedRemainingDuration
      });
    });

    stream.pipe(parser);
  }

  async analyzeLocationEntry(locationEntry) {
    //test
    let date = new Date(parseInt(locationEntry["timestampMs"]));
    this.setState({
      latestDateProcessed: date.toLocaleDateString('en-CA')
    });
    let lat = locationEntry["latitudeE7"] / 1e7;
    let lng = locationEntry["longitudeE7"] / 1e7;
    let dateFromState = dates.find(obj => {
      return obj.date === date.toLocaleDateString('en-CA')
    });

    if (dateFromState === undefined) {
      dateFromState = {
        "date": date.toLocaleDateString('en-CA'),
        "boxesMatched": []
      };
      dates.push(dateFromState);
    }
    this.findMatchingBoxes(boxes, date, dateFromState, lng, lat, this.addMatchedBoxesToState);
  }

  addMatchedBoxesToState(date, dateFromState, boxesMatched) {
    if (dateFromState !== undefined) {
      dateFromState.boxesMatched = [...new Set([...dateFromState.boxesMatched, ...boxesMatched])];
    }

  }

  findMatchingBoxes(boxes, date, dateFromState, lng, lat, callback) {
    let boxesMatched = [];
    for (const box of boxes) {
      if (!dateFromState.boxesMatched.includes(box.id) && pointInPolygon([lng, lat], box.polygon)) {
        //position is in box
        boxesMatched.push(box.id);
      }

    }
    if (boxesMatched.length !== 0) {
      callback(date, dateFromState, boxesMatched);
    }

  }

}

export default App;
