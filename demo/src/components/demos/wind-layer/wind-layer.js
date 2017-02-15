import {Layer, assembleShaders} from 'deck.gl';
import {GL, Model, Geometry, Program} from 'luma.gl';
import {join} from 'path';
import vertex from './wind-layer-vertex.js';
import fragment from './wind-layer-fragment.js';
import DelaunayInterpolation from './delaunay-interpolation.js'

export default class WindLayer extends Layer {

  /**
   * @classdesc
   * WindLayer
   *
   * @class
   * @param {object} opts
   */ 
  constructor(opts) {
    super(opts);
  }

  initializeState() {
    const {gl} = this.context;
    const {attributeManager} = this.state;
    const {bbox, texData, time} = this.props;
    console.log('model', time);
    const model = this.getModel(gl, bbox, 200, 100, texData);

    this.setState({model, texData});
  }

  createTexture(gl, opt) {
    return new DelaunayInterpolation({gl})
      .createTexture(gl, {
          data: {
            internalFormat: gl.RGBA32F,
            format: gl.RGBA,
            value: false,
            type: gl.FLOAT,
            width: opt.width,
            height: opt.height,
            border: 0
          }
        });
  }

  getModel(gl, bbox, nx, ny, texData) {
    // This will be a grid of elements
    let {dataBounds, textureArray, textureSize} = texData,
        {width, height} = textureSize,
        textureFrom = this.createTexture(gl, {width, height}),
        textureTo = this.createTexture(gl, {width, height}),
        diffX = bbox.maxLng - bbox.minLng,
        diffY = bbox.maxLat - bbox.minLat,
        spanX = diffX / (nx - 1),
        spanY = diffY / (ny - 1),
        positions = new Float32Array(nx * ny * 3 * 2),
        timeInt = 0,
        delta = 0;
    // build lines for the vector field
    // TODO(nico): this should be computed only once
    for (let i = 0; i < nx; ++i) {
      for (let j = 0; j < ny; ++j) {
        let index = (i + j * nx) * 3 * 2;
        positions[index + 0] = i * spanX + bbox.minLng;
        positions[index + 1] = j * spanY + bbox.minLat;
        positions[index + 2] = 0;
        
        positions[index + 3] = i * spanX + bbox.minLng;
        positions[index + 4] = j * spanY + bbox.minLat;
        positions[index + 5] = 1;
      }
    }

    const model = new Model({
      program: new Program(gl, assembleShaders(gl, {
        vs: vertex,
        fs: fragment
      })),
      geometry: new Geometry({
        id: this.props.id,
        drawMode: 'LINES',
        positions
      }),
      isIndexed: false,
      onBeforeRender: () => {
        // upload texture (data) before rendering
        gl.bindTexture(gl.TEXTURE_2D, textureFrom);
        gl.activeTexture(gl.TEXTURE0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, textureArray[model.props && model.props.timeInt || timeInt], 0);
        
        gl.bindTexture(gl.TEXTURE_2D, textureTo);
        gl.activeTexture(gl.TEXTURE1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, textureArray[(model.props && model.props.timeInt || timeInt) + 1], 0);

        model.program.setUniforms({
          bbox: [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat],
          size: [width, height],
          delta: (model.props && model.props.delta || delta),
          bounds0: [dataBounds[0].min, dataBounds[0].max],
          bounds1: [dataBounds[1].min, dataBounds[1].max],
          bounds2: [dataBounds[2].min, dataBounds[2].max]
        });
        gl.lineWidth(8);
      },
      onAfterRender: () => {
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
    });

    return model;
  }

  updateState({props, oldProps, changeFlags: {dataChanged, somethingChanged}}) {
    const {time} = this.props;
    const timeInt = Math.floor(time);
    const delta = time - timeInt;
    this.state.model.props = {
      timeInt,
      delta
    };
    this.setUniforms({
      delta
    });
  }

  countVertices(data) {
  }

  updateUniforms() {

  }

  calculateIndices(attribute) {
  }

  calculatePositions(attribute) {
  }

  calculateColors(attribute) {
  }
}