// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {Layer} from '../../../lib';
import {assembleShaders} from '../../../shader-utils';
import {GL, Model, Geometry} from 'luma.gl';
import {readFileSync} from 'fs';
import {join} from 'path';

const DEFAULT_COLOR = [0, 0, 0, 255];

const defaultProps = {
  getPosition: x => x.position,
  getRadius: x => x.radius || 1,
  getColor: x => x.color || DEFAULT_COLOR,
  radiusScale: 1,  //  point radius in meters
  radiusMinPixels: 0, //  min point radius in pixels
  radiusMaxPixels: Number.MAX_SAFE_INTEGER, // max point radius in pixels
  outline: false
};

export default class ScatterplotLayer extends Layer {
  getShaders(id) {
    return {
      vs: readFileSync(join(__dirname, './scatterplot-layer-vertex.glsl'), 'utf8'),
      fs: readFileSync(join(__dirname, './scatterplot-layer-fragment.glsl'), 'utf8')
    };
  }

  initializeState() {
    const {gl} = this.context;
    this.setState({model: this._getModel(gl)});

    /* eslint-disable max-len */
    /* deprecated props check */
    if (this.props.radius !== undefined) {
      log.once(0, `ScatterplotLayer no longer accepts props.radius in this version of deck.gl. Please use props.radiusScale instead.`);
    }

    if (this.props.outline !== undefined) {
      log.once(0, `ScatterplotLayer no longer accepts props.drawOutline in this version of deck.gl. Please use props.outline instead.`);
    }

    if (this.props.strokeWidth !== undefined) {
      log.once(0, `ScatterplotLayer no longer accepts props.strokeWidth in this version of deck.gl.`);
    }

    this.state.attributeManager.addInstanced({
      instancePositions: {size: 3, accessor: 'getPosition', update: this.calculateInstancePositions},
      instanceRadius: {size: 1, accessor: 'getRadius', update: this.calculateInstanceRadius},
      instanceColors: {size: 4, type: GL.UNSIGNED_BYTE, accessor: 'getColor', update: this.calculateInstanceColors}
    });
    /* eslint-enable max-len */
  }

  updateState({props, oldProps}) {
    if (props.outline !== oldProps.outline) {
      this.state.model.geometry.drawMode = props.outline ? GL.LINE_LOOP : GL.TRIANGLE_FAN;
    }
  }

  draw({uniforms}) {
    this.state.model.render(Object.assign({}, uniforms, {
      radiusScale: this.props.radiusScale,
      radiusMinPixels: this.props.radiusMinPixels,
      radiusMaxPixels: this.props.radiusMaxPixels
    }));
  }

  _getModel(gl) {
    const NUM_SEGMENTS = 16;
    const positions = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      positions.push(
        Math.cos(Math.PI * 2 * i / NUM_SEGMENTS),
        Math.sin(Math.PI * 2 * i / NUM_SEGMENTS),
        0
      );
    }
    /* eslint-disable */


    const shaders = assembleShaders(gl, this.getShaders());

    return new Model({
      gl,
      id: this.props.id,
      vs: shaders.vs,
      fs: shaders.fs,
      geometry: new Geometry({
        drawMode: GL.TRIANGLE_FAN,
        positions: new Float32Array(positions)
      }),
      isInstanced: true
    });
    return model;
  }

  calculateInstancePositions(attribute) {
    const {data, getPosition} = this.props;
    const {value} = attribute;
    let i = 0;
    for (const point of data) {
      const position = getPosition(point);
      value[i++] = position[0];
      value[i++] = position[1];
      value[i++] = position[2] || 0;
    }
  }

  calculateInstanceRadius(attribute) {
    const {data, getRadius} = this.props;
    const {value} = attribute;
    let i = 0;
    for (const point of data) {
      const radius = getRadius(point);
      value[i++] = isNaN(radius) ? 1 : radius;
    }
  }

  calculateInstanceColors(attribute) {
    const {data, getColor} = this.props;
    const {value} = attribute;
    let i = 0;
    for (const point of data) {
      const color = getColor(point);
      value[i++] = color[0];
      value[i++] = color[1];
      value[i++] = color[2];
      value[i++] = isNaN(color[3]) ? 255 : color[3];
    }
  }
}

ScatterplotLayer.layerName = 'ScatterplotLayer';
ScatterplotLayer.defaultProps = defaultProps;
