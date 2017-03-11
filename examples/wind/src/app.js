/* global window,document */
import 'babel-polyfill';
import React, {Component} from 'react';
import {render} from 'react-dom';
import MapGL from 'react-map-gl';
import Wind from './wind';
import ControlPanel from './control-panel';

// animation
import TWEEN from 'tween.js';
const animate = () => {
  TWEEN.update();
  window.requestAnimationFrame(animate);
};

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN; // eslint-disable-line

class Root extends Component {

  constructor(props) {
    super(props);
    this.state = {
      viewport: {
        width: 500,
        height: 500,
        longitude: -98.31907156932937,
        latitude: 37.613897372628045,
        zoom: 4.241754140284522,
        maxZoom: 16,
        pitch: 37.11535300402728,
        bearing: -0.6424747174301046
      },
      params: {
        time: 30.4,
        toggleParticles: true,
        toggleWind: true,
        toggleElevation: true
      }
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this._onResize);
    this._onResize();
    animate();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  _onResize = () => {
    this._updateViewport({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  _updateViewport = viewport => {
    this.setState({
      viewport: {...this.state.viewport, ...viewport}
    });
  }

  _updateParams = params => {
    this.setState({
      params: {...this.state.params, ...params}
    });
  }

  render() {
    const {viewport, params} = this.state;

    return (
      <div>
        <MapGL
          {...viewport}
          mapStyle="mapbox://styles/mapbox/dark-v9"
          mapboxApiAccessToken={MAPBOX_TOKEN}
          perspectiveEnabled
          onChangeViewport={this._updateViewport}>

          <Wind viewport={viewport} params={params} />

        </MapGL>

        <div className="control-panel">
          <h1>Wind</h1>
          <p>Visualize wind on vector fields and particles.</p>
          <p>Use <b>cmd + drag</b> to change the map view.</p>
          <p>A <a href="http://deck.gl">deck.gl</a> demo by <a href="https://twitter.com/philogb">@philogb</a>.</p>
          <p>Data source: <a href="http://www.census.gov">NCAA</a></p>

          <hr />

          <ControlPanel params={params} onChange={this._updateParams} />

        </div>

      </div>
    );
  }
}

render(<Root />, document.body.appendChild(document.createElement('div')));
