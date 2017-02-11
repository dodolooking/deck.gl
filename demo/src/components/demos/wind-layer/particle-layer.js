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
    const model = this.getModel(gl, bbox, 200, 100, texData);

    this.setState({model, texData});
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
        textureObject = this.createTexture(gl, {width, height}),
        diffX = bbox.maxLng - bbox.minLng,
        diffY = bbox.maxLat - bbox.minLat,
        spanX = diffX / (nx - 1),
        spanY = diffY / (ny - 1),
        dim3 = nx * ny * 3,
        dim4 = nx * ny * 4,
        positions3 = new Float32Array(dim3),
        positions4 = new Float32Array(dim4),
        bufferFrom = new Buffer(gl),
        bufferTo = new Buffer(gl),
        tf = gl.createTransformFeedback();

    // set points
    for (let i = 0; i < nx; ++i) {
      for (let j = 0; j < ny; ++j) {
        let index4 = (i + j * nx) * 4;
        let index3 = (i + j * nx) * 3;
        positions3[index4 + 0] = i * spanX + bbox.minLng;
        positions3[index4 + 1] = j * spanY + bbox.minLat;
        positions3[index4 + 2] = 0;

        positions4[index4 + 0] = i * spanX + bbox.minLng;
        positions4[index4 + 1] = j * spanY + bbox.minLat;
        positions4[index4 + 2] = i * spanX + bbox.minLng;
        positions4[index4 + 3] = j * spanY + bbox.minLat;
      }
    }

    bufferFrom.setData({
      data: positions4,
      target: gl.ARRAY_BUFFER,
      usage: gl.DYNAMIC_COPY,
      type: gl.FLOAT,
      size: dim4
    });

    bufferTo.setData({
      target: gl.ARRAY_BUFFER,
      usage: gl.DYNAMIC_COPY,
      type: gl.FLOAT,
      size: dim4,
      bytes: dim4 * Float32Array.BYTES_PER_ELEMENT
    });

    const modelTF = new Model({
      program: new ProgramTransformFeedback(gl, assembleShaders(gl, {
        vs: vertexTF,
        fs: fragmentTF
      })),
      geometry: new Geometry({
        id: this.props.id,
        drawMode: 'POINTS',
        positions: positions3,
        attributes: {
          posFrom: bufferFrom
        }
      }),
      onBeforeRender: () => {
        // set uniforms
        modelTF.setAttributes({
          posFrom: bufferFrom
        });

        modelTF.program.setUniforms({
          bbox: [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat],
          bounds0: dataBounds[0],
          bounds1: dataBounds[1],
          bounds2: dataBounds[2]
        });

        // upload texture (data) before rendering
        gl.bindTexture(gl.TEXTURE_2D, textureObject);
        gl.activeTexture(gl.TEXTURE0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, textureArray[0]);

        // setup transform feedback
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bufferTo.handle);
        gl.beginTransformFeedback(gl.POINTS);
      },
      onAfterRender: () => {
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.endTransformFeedback();
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
        positions: positions3,
        attributes: {
          posTo: bufferTo
        }
      }),
      isIndexed: false,
      onBeforeRender: () => {
        model.setAttributes({
          posTo: bufferTo
        });
        modelTF.render();
      },
      onAfterRender: () => {
        // swap buffers
        [bufferFrom, bufferTo] = [bufferTo, bufferFrom];
      }
    });

    return model;
  }

  updateState({props, oldProps, changeFlags: {dataChanged, somethingChanged}}) {
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