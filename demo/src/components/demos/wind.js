import {GL} from 'luma.gl';
import React, {Component} from 'react';
import {voronoi} from 'd3-voronoi';
import {ScatterplotLayer} from 'deck.gl';
import DeckGL from 'deck.gl/react';
import WindLayer from './wind-layer/wind-layer';
import DelaunayCoverLayer from './wind-layer/delaunay-cover-layer';

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
      colorM: {displayName: 'Male', type: 'color', value: '#08f'},
      colorF: {displayName: 'Female', type: 'color', value: '#f08'},
      colorN: {displayName: 'Female', type: 'color', value: '#dd3'},
      radius: {displayName: 'Radius', type: 'number', value: 150, step: 0.1, min: 0.1}
    };
  }

  static get viewport() {
    return {
      mapStyle: MAPBOX_STYLES.DARK,
      longitude: -74,
      latitude: 40.7,
      zoom: 11,
      maxZoom: 16,
      pitch: 0,
      bearing: 0
    };
  }

  static renderInfo(meta) {
    return (
      <div>
        <h3>Wind</h3>
        <p>Wind</p>
        <p>Data source: <a href="http://www.census.gov">US Census Bureau</a></p>
        <div className="stat">Instances
          <b>{ readableInteger(meta.size || 0) }</b>
        </div>
      </div>
    );
  }

  getBBox(data) {
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

  triangulate(data) {
    data.forEach((d, i) => d.index = i);
    return voronoi(data)
            .x(d => -d.long)
            .y(d =>  d.lat)
            .triangles(data);
  }

  render() {
    const {viewport, params, data} = this.props;

    if (!data) {
      return null;
    }

    const bbox = data[0] && this.getBBox(data[0]);
    const triangulation = bbox && this.triangulate(data[0]);


    const layers = [].concat(
      data[0] && new ScatterplotLayer({
        id: 'stations',
        data: data[0],
        getPosition: d => [-d.long, d.lat, +d.elv],
        getColor: d => params.colorN.value,
        getRadius: d => params.radius.value,
        opacity: 0.2
      }),
      data[0] && new DelaunayCoverLayer({
        id: 'delaunay-cover',
        triangulation
      }),
      data[0] && data[1] && new WindLayer({
        id: 'wind',
        bbox: bbox,
        stations: data[0],
        measures: data[1],
        triangulation
      })
    ).filter(Boolean);

    return (
      <DeckGL {...viewport} layers={ layers } />
    );
  }
}
