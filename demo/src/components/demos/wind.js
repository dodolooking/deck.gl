import {GL} from 'luma.gl';
import React, {Component} from 'react';
import {voronoi} from 'd3-voronoi';
import {ScatterplotLayer} from 'deck.gl';
import DeckGL from 'deck.gl/react';
import WindLayer from './wind-layer/wind-layer';
import DelaunayCoverLayer from './wind-layer/delaunay-cover-layer';
import ParticleLayer from './wind-layer/particle-layer';
import DelaunayInterpolation from './wind-layer/delaunay-interpolation';
import ViewportAnimation from '../../utils/map-utils';

import {MAPBOX_STYLES} from '../../constants/defaults';
import {readableInteger} from '../../utils/format-utils';

export default class WindDemo extends Component {

  static get data() {
    return [
      {
        url: 'data/stations.json',
        worker: 'workers/wind-stations-data-decoder.js?loop=1800&trail=180'
      },
      {
        url: 'data/weather.bin',
        worker: 'workers/wind-weather-data-decoder.js',
        type: 'binary'
      }
    ];
  }

  static get parameters() {
    return {
      toggleParticles: {displayName: 'particles', type: 'checkbox', checked: false},
      toggleWind: {displayName: 'field', type: 'checkbox', checked: true},
      toggleElevation: {displayName: 'elevation', type: 'checkbox', checked: true},
      time: {displayName: 'time (h)', type: 'range', value: 0, min: 0, max: 70, step: 0.1},
      // colorN: {displayName: 'stations', type: 'color', value: '#dd3'},
      // radius: {displayName: 'radius', type: 'range', value: 150, step: 0.1, min: 0.1, max: 250}
    };
  }

static done(owner, data) {
    console.log('done');
    const bbox = owner.getBBox(data[0]);
    const triangulation = owner.triangulate(data[0]);

    return {
      bbox,
      triangulation,
      texData: new DelaunayInterpolation({
        bbox,
        triangulation,
        measures: data[1],
        textureWidth: 512
      }).generateTextures()
    };
  }

  static getBBox(data) {
    let minLat =  Infinity;
    let maxLat = -Infinity;
    let minLng =  Infinity;
    let maxLng = -Infinity;

    data.forEach(d => {
      minLat = d.lat < minLat ? d.lat : minLat;
      minLng = -d.long < minLng ? -d.long : minLng;
      maxLat = d.lat > maxLat ? d.lat : maxLat;
      maxLng = -d.long > maxLng ? -d.long : maxLng;
    });

    return {minLat, minLng, maxLat, maxLng};
  }

  static triangulate(data) {
    data.forEach((d, i) => d.index = i);
    return voronoi(data)
            .x(d => -d.long)
            .y(d =>  d.lat)
            .triangles(data);
  }

  static get viewport() {
    return {
      mapStyle: MAPBOX_STYLES.DARK,
      longitude: -100,
      latitude: 40.7,
      zoom: 3.8,
      maxZoom: 16,
      pitch: 0,
      bearing: 0
    };
  }

  constructor(props) {
    super(props);

    this.state = {time: 0};

    const thisDemo = this; // eslint-disable-line

    this.tween = ViewportAnimation.ease({time: 0}, {time: 1800}, 60000)
      .onUpdate(function tweenUpdate() {
        thisDemo.setState(this); // eslint-disable-line
      })
      .repeat(Infinity);
  }

  componentDidMount() {
    this.tween.start();
  }

  componentWillUnmount() {
    this.tween.stop();
  }

  render() {
    const {viewport, params, data} = this.props;

    if (!data || !data.derived) {
      return null;
    }

    const {derived} = data;
    const {triangulation, texData, bbox} = derived;

    // console.log(params.time.value);
    const layers = [].concat(
      data[0] && new ScatterplotLayer({
        id: 'stations',
        data: data[0],
        getPosition: d => [-d.long, d.lat, +d.elv],
        getColor: d => [200, 200, 100],
        getRadius: d => 150,
        opacity: 0.2
      }),
      false && params.toggleParticles.checked && data[0] && data[1] && new ParticleLayer({
        id: 'particles',
        bbox,
        texData,
        time: params.time.value
      }),
      params.toggleWind.checked && data[0] && data[1] && new WindLayer({
        id: 'wind',
        bbox,
        texData,
        time: params.time.value
      }),
      params.toggleElevation.checked && data[0] && data[1] && new DelaunayCoverLayer({
        id: 'delaunay-cover',
        triangulation
      })
    ).filter(Boolean);

    const deckglOpt = {glOptions: {webgl2: true}, ...viewport};

    return (
      <DeckGL {...deckglOpt} layers={ layers } />
    );
  }

  static renderInfo(meta) {
    return (
      <div>
        <h3>Wind</h3>
        <p>Visualize wind on vector fields and particles.</p>
        <p>Data source: <a href="http://www.census.gov">NCAA</a></p>
      </div>
    );
  }
}
