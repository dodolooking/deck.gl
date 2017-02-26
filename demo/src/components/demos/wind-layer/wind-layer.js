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
    const model = this.getModel(gl, bbox, 80, 30, texData);

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

  getNumInstances() {
    return this.state.numInstances;
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
        positions = new Float32Array(nx * ny * 3),
        instances = nx * ny,
        timeInt = 0,
        delta = 0;

    this.state.numInstances = instances;
    // build lines for the vector field
    for (let i = 0; i < nx; ++i) {
      for (let j = 0; j < ny; ++j) {
        let index = (i + j * nx) * 3;
        positions[index + 0] = i * spanX + bbox.minLng;
        positions[index + 1] = j * spanY + bbox.minLat;
        positions[index + 2] = 0;
      }
    }

    const model = new Model({
      program: new Program(gl, assembleShaders(gl, {
        vs: vertex,
        fs: fragment
      })),
      isIndexed: false,
      isInstanced: true,
      geometry: new Geometry({
        id: this.props.id,
        drawMode: 'TRIANGLE_FAN',
        isInstanced: true,
        instanceCount: 1,
        attributes: {
          positions: {
            value: positions,
            instanced: 1,
            type: gl.FLOAT,
            size: 3
          },
          vertices: {
            value: new Float32Array([0.3, 0, 250, 0, 0.10, 0, 1, 0, 0, 0, -0.10, 0, 0, 0.10, 0]),
            size: 3,
            type: gl.FLOAT
          },
          normals: {
            value: new Float32Array([0, 0, 1, 0, 0.10, 0, 1, 0, 0, 0, -0.10, 0, 0, 0.10, 0]),
            size: 3,
            type: gl.FLOAT
          }
        }
      }),
      onBeforeRender: () => {
        // console.log(
        //   model.props && model.props.timeInt || timeInt,
        //   (model.props && model.props.timeInt || timeInt) + 1,
        //   (model.props && model.props.delta || delta)
        // );
//        console.log(textureArray[(model.props && model.props.timeInt || timeInt) + 1]);

        model.program.setUniforms({
          bbox: [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat],
          size: [width, height],
          delta: (model.props && model.props.delta || delta),
          bounds0: [dataBounds[0].min, dataBounds[0].max],
          bounds1: [dataBounds[1].min, dataBounds[1].max],
          bounds2: [dataBounds[2].min, dataBounds[2].max],
          lightsPosition: [-70.585, 38.00, 15000],
          ambientRatio: 0.9,
          diffuseRatio: 0.8,
          specularRatio: 0.9,
          lightsStrength: [1.0, 0.0],
          numberOfLights: 2,
          dataFrom: 0,
          dataTo: 1
        });

        // upload texture (data) before rendering
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureFrom);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT,
          textureArray[(model.props && model.props.timeInt || timeInt)], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textureTo);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT,
         textureArray[(model.props && model.props.timeInt || timeInt) + 1], 0);

        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
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
    // this.setUniforms({
    //   delta
    // });
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