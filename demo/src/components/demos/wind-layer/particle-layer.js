import {Layer, assembleShaders} from 'deck.gl';
import {GL, Model, Geometry, Program, Buffer} from 'luma.gl';
import ProgramTransformFeedback from './program-transform-feedback.js'
import {join} from 'path';
import vertex from './particle-layer-vertex.js';
import fragment from './particle-layer-fragment.js';
import vertexTF from './transform-feedback-vertex.js';
import fragmentTF from './transform-feedback-fragment.js';
import DelaunayInterpolation from './delaunay-interpolation.js'

export default class ParticleLayer extends Layer {

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
    const {bbox, texData} = this.props;
    const {model, modelTF} = this.getModel(gl, bbox, 1200, 600, texData);

    this.setState({model, modelTF, texData});
  }

  createTexture(gl, opt) {
    return new DelaunayInterpolation({gl})
      .createTexture(gl, {
          data: {
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
        dim3 = nx * ny * 3,
        dim4 = nx * ny * 4,
        positions3 = new Float32Array(dim3),
        positions4 = new Float32Array(dim4),
        tf = gl.createTransformFeedback(),
        timeInt = 0,
        delta = 0;

    // set points
    for (let i = 0; i < nx; ++i) {
      for (let j = 0; j < ny; ++j) {
        let index4 = (i + j * nx) * 4;
        let index3 = (i + j * nx) * 3;
        positions3[index3 + 0] = (bbox.maxLng - bbox.minLng) * Math.random() + bbox.minLng;
        positions3[index3 + 1] = (bbox.maxLat - bbox.minLat) * Math.random() + bbox.minLat;
        positions3[index3 + 2] = 0;

        positions4[index4 + 0] = i * spanX + bbox.minLng;
        positions4[index4 + 1] = j * spanY + bbox.minLat;
        positions4[index4 + 2] = (bbox.maxLng - bbox.minLng) * Math.random() + bbox.minLng;
        positions4[index4 + 3] = (bbox.maxLat - bbox.minLat) * Math.random() + bbox.minLat;
      }
    }

    let bufferFrom = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferFrom);
    gl.bufferData(gl.ARRAY_BUFFER, positions4, gl.DYNAMIC_COPY);

    let bufferTo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferTo);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * positions4.length, gl.DYNAMIC_COPY);
    
    let bufferSwap;

    const modelTF = new Model({
        program: new ProgramTransformFeedback(gl, assembleShaders(gl, {
        vs: vertexTF,
        fs: fragmentTF
      })),
      geometry: new Geometry({
        id: this.props.id,
        drawMode: 'POINTS',
        positions: positions3
      }),
      onBeforeRender: () => {
        // set uniforms
        modelTF.program.setUniforms({
          bbox: [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat],
          bounds0: [dataBounds[0].min, dataBounds[0].max],
          bounds1: [dataBounds[1].min, dataBounds[1].max],
          bounds2: [dataBounds[2].min, dataBounds[2].max]
        });
        // upload texture (data) before rendering
        gl.bindTexture(gl.TEXTURE_2D, textureFrom);
        gl.activeTexture(gl.TEXTURE0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, textureArray[modelTF.props && modelTF.props.timeInt || timeInt], 0);
        
        gl.bindTexture(gl.TEXTURE_2D, textureTo);
        gl.activeTexture(gl.TEXTURE1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, textureArray[(modelTF.props && modelTF.props.timeInt || timeInt) + 1], 0);
        // setup transform feedback
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
        let loc = model.program._attributeLocations['posFrom'];
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferFrom);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 4, gl.FLOAT, gl.FALSE, 0, 0);
        gl.vertexAttribDivisor(loc, 0);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bufferTo);
        gl.beginTransformFeedback(gl.POINTS);
      },
      onAfterRender: () => {
        gl.endTransformFeedback();
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      },
      isIndexed: false
    });

    const model = new Model({
      program: new Program(gl, assembleShaders(gl, {
        vs: vertex,
        fs: fragment
      })),
      geometry: new Geometry({
        id: this.props.id,
        drawMode: 'POINTS',
        positions: positions3
      }),
      isIndexed: false,
      onBeforeRender: () => {
        modelTF.render();
        model.setProgramState();
        model.program.setUniforms({
          bbox: [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat],
          bounds0: [dataBounds[0].min, dataBounds[0].max],
          bounds1: [dataBounds[1].min, dataBounds[1].max],
          bounds2: [dataBounds[2].min, dataBounds[2].max]
        });
        // upload texture (data) before rendering
        gl.bindTexture(gl.TEXTURE_2D, textureFrom);
        gl.activeTexture(gl.TEXTURE0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, textureArray[model.props && model.props.timeInt || timeInt], 0);
        
        gl.bindTexture(gl.TEXTURE_2D, textureTo);
        gl.activeTexture(gl.TEXTURE1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, textureArray[(model.props && model.props.timeInt || timeInt) + 1], 0);
        
        let loc = model.program._attributeLocations['posFrom'];
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferTo);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 4, gl.FLOAT, gl.FALSE, 0, 0);
        gl.vertexAttribDivisor(loc, 0);
      },
      onAfterRender: () => {
        // swap buffers
        bufferSwap = bufferFrom;
        bufferFrom = bufferTo;
        bufferTo = bufferSwap;
      }
    });

    return {model, modelTF};
  }

  updateState({props, oldProps, changeFlags: {dataChanged, somethingChanged}}) {
    const {time} = this.props;
    const timeInt = Math.floor(time);
    const delta = time - timeInt;
    this.state.model.props = {
      timeInt,
      delta
    };
    this.state.modelTF.props = {
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