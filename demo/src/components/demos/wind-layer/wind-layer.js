import {Layer, assembleShaders} from 'deck.gl';
import {GL, Model, Geometry, Program} from 'luma.gl';
import {join} from 'path';
import vertex from './wind-layer-vertex.js';
import fragment from './wind-layer-fragment.js';
import delaunayVertex from './delaunay-vertex.js';
import delaunayFragment from './delaunay-fragment.js';

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

  getTextureWidth() {
    return 1024;
  }

  updateState({props, oldProps, changeFlags: {dataChanged, somethingChanged}}) {
    // if (dataChanged) {
    //   this.countVertices(props.data);
    // }
    // if (somethingChanged) {
    //   this.updateUniforms();
    // }
  }

  initializeState() {
    const {gl} = this.context;
    const {attributeManager} = this.state;
    const {bbox, stations, measures, triangulation} = this.props;
    const {txt, textures, bounds} = this.generateTextures(gl, bbox, triangulation, measures);
    const model = this.getModel(gl, bbox, 200, 100, textures, txt, bounds);
    let diffX = bbox.maxLng - bbox.minLng,
        diffY = bbox.maxLat - bbox.minLat,
        width = this.getTextureWidth(),
        height = Math.ceil(width * diffY / diffX);

    // attributeManager.addDynamic({
    //   indices: {size: 1, update: this.calculateIndices, isIndexed: true},
    //   positions: {size: 3, update: this.calculatePositions},
    //   colors: {size: 3, update: this.calculateColors}
    // });
    // gl.getExtension('OES_element_index_uint');

    this.setState({model, textures});

    // gl.lineWidth(this.props.strokeWidth);
    // this.countVertices();
    // this.updateUniforms();
  }

  getModel(gl, bbox, nx, ny, textures, txt, bounds) {
    // This will be a grid of elements
    let diffX = bbox.maxLng - bbox.minLng,
        diffY = bbox.maxLat - bbox.minLat,
        spanX = diffX / (nx - 1),
        spanY = diffY / (ny - 1),
        positions = new Float32Array(nx * ny * 3 * 2),
        width = this.getTextureWidth(),
        height = Math.ceil(width * diffY / diffX),
        that = this,
        textureSet = false;

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

    let model = new Model({
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
        gl.bindTexture(gl.TEXTURE_2D, txt);
        gl.activeTexture(gl.TEXTURE0);
        // if (!textureSet) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, textures[0]);
          textureSet = true;
        // }

        model.program.setUniforms({
          bbox: [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat],
          size: [width, height],
          bounds0: [bounds[0].min, bounds[0].max],
          bounds1: [bounds[1].min, bounds[1].max],
          bounds2: [bounds[2].min, bounds[2].max]
        });
        gl.lineWidth(3);
        // gl.enable(gl.BLEND);
        // gl.enable(gl.POLYGON_OFFSET_FILL);
        // gl.polygonOffset(2.0, 1.0);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        // gl.blendEquation(gl.FUNC_ADD);
      },
      onAfterRender: () => {
        gl.bindTexture(gl.TEXTURE_2D, null);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // gl.disable(gl.POLYGON_OFFSET_FILL);
      }
    });

    return model;
  }

  getDelaunayShaders() {
    return {
      vs: delaunayVertex,
      fs: delaunayFragment
    };
  }

  getDelaunayModel(gl, triangulation) {
    const positions = [];
    triangulation.forEach(t => positions.push(-t[0].long, t[0].lat, t[0].elv, -t[1].long, t[1].lat, t[1].elv, -t[2].long, t[2].lat, t[2].elv));
    /* eslint-disable */
    const shaders = assembleShaders(gl, this.getDelaunayShaders());

    return new Model({
      gl,
      id: 'delaunay',
      program: new Program(gl, shaders),
      geometry: new Geometry({
        drawMode: 'TRIANGLES',
        positions: new Float32Array(positions)
      }),
      isInstanced: false
    });
  }

  createTexture(gl, options) {
    // This will be a floating point texture
    gl.getExtension('OES_texture_float');

    let opt = Object.assign({
      textureType: gl.TEXTURE_2D,
      pixelStore: [{
        name: gl.UNPACK_FLIP_Y_WEBGL,
        value: true
      }],
      parameters: [{
        name: gl.TEXTURE_MAG_FILTER,
        value: gl.NEAREST
      }, {
        name: gl.TEXTURE_MIN_FILTER,
        value: gl.NEAREST
      }, {
        name: gl.TEXTURE_WRAP_S,
        value: gl.CLAMP_TO_EDGE
      }, {
        name: gl.TEXTURE_WRAP_T,
        value: gl.CLAMP_TO_EDGE
      }],
      data: {
        format: gl.RGBA,
        value: false,
        type: gl.FLOAT,

        width: 0,
        height: 0,
        border: 0
      }
    }, options);

    let textureType = opt.textureType,
        textureTarget = textureType,
        texture = gl.createTexture(),
        pixelStore = opt.pixelStore,
        parameters = opt.parameters,
        data = opt.data,
        value = data.value,
        type = data.type,
        format = data.format,
        hasValue = !!data.value;

    gl.bindTexture(textureType, texture);

    //set texture properties
    pixelStore.forEach(opt => gl.pixelStorei(opt.name, opt.value));

    //load texture
    if (hasValue) {
      if ((data.width || data.height) && (!value.width && !value.height)) {
        gl.texImage2D(textureTarget, 0, format, data.width, data.height, data.border, format, type, value);
      } else {
        gl.texImage2D(textureTarget, 0, format, format, type, value);
      }

    //we're setting a texture to a framebuffer
    } else if (data.width || data.height) {
      gl.texImage2D(textureTarget, 0, format, data.width, data.height, data.border, format, type, null);
    }
    //set texture parameters
    for (let i = 0; i < parameters.length; i++) {
      let opti = parameters[i];
      gl.texParameteri(textureType, opti.name, opti.value);
    }

    return texture;
  }

  createRenderbuffer(gl, options) {
    let opt = Object.assign({
      storageType: gl.DEPTH_COMPONENT16,
      width: 0,
      height: 0
    }, options);

    let renderBuffer = gl.createRenderbuffer(gl.RENDERBUFFER);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, opt.storageType, opt.width, opt.height);

    return renderBuffer;
  }

  createFramebufferWithTexture(gl, options) {
    let opt = Object.assign({
      width: 0,
      height: 0,
      //All texture params
      bindToTexture: false,
      textureOptions: {
        attachment: gl.COLOR_ATTACHMENT0
      },
      //All render buffer params
      bindToRenderBuffer: false,
      renderBufferOptions: {
        attachment: gl.DEPTH_ATTACHMENT
      }
    }, options.fb);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // create fb
    let fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // create txt
    let txt = this.createTexture(gl, options.txt);

    let bindToTexture = opt.bindToTexture,
        bindToRenderBuffer = opt.bindToRenderBuffer,
        texOpt = opt.textureOptions;

    // bind to texture
    gl.framebufferTexture2D(gl.FRAMEBUFFER, texOpt.attachment, gl.TEXTURE_2D, txt, 0);

    // create rb
    let rb = this.createRenderbuffer(gl, options.rb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

    return {fb, rb, txt};
  }

  generateTextures(gl, bbox, triangulation, measures) {
    let delaunayModel = this.getDelaunayModel(gl, triangulation),
        lngDiff = Math.abs(bbox.maxLng - bbox.minLng),
        latDiff = Math.abs(bbox.maxLat - bbox.minLat),
        width = this.getTextureWidth(),
        height = Math.ceil(latDiff * width / lngDiff),
        bounds = [],
        {fb, rb, txt} = this.createFramebufferWithTexture(gl, {
          fb: {width, height},
          rb: {width, height},
          txt: {
            data: {
              format: gl.RGBA,
              value: false,
              type: gl.FLOAT,
              width,
              height,
              border: 0
            }
          }
        });

    // basic gl set up
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clearDepth(1.0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    const textures = measures.slice(0, 1).map((measure, hour) => {
      let sample = [];      
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      triangulation.forEach(triplet => {
        if (!bounds[0]) {
          bounds[0] = {min: measure[triplet[0].index][0], max: measure[triplet[0].index][0]};
          bounds[1] = {min: measure[triplet[0].index][1], max: measure[triplet[0].index][1]};
          bounds[2] = {min: measure[triplet[0].index][2], max: measure[triplet[0].index][2]};
        } else {
          [0, 1, 2].forEach(index => {
            triplet.forEach(t => {
              if (measure[t.index][index] !== 0) {
                bounds[index].min = bounds[index].min > measure[t.index][index] ? measure[t.index][index] : bounds[index].min;
                bounds[index].max = bounds[index].max < measure[t.index][index] ? measure[t.index][index] : bounds[index].max;
              }
            });
          });
        }

        sample.push(
          measure[triplet[0].index][0],
          measure[triplet[0].index][1],
          measure[triplet[0].index][2],

          measure[triplet[1].index][0],
          measure[triplet[1].index][1],
          measure[triplet[1].index][2],

          measure[triplet[2].index][0],
          measure[triplet[2].index][1],
          measure[triplet[2].index][2]
        );
      });

      delaunayModel.setAttributes({
        data: {
          id: 'data',
          value: new Float32Array(sample),
          bytes: Float32Array.BYTES_PER_ELEMENT * sample.length,
          size: 3,
          type: gl.FLOAT,
          isIndexed: false
        }
      });

      // TODO(nico): one of these calls is useless.
      delaunayModel.geometry.setAttributes({
        data: {
          id: 'data',
          value: new Float32Array(sample),
          bytes: Float32Array.BYTES_PER_ELEMENT * sample.length,
          size: 3,
          type: gl.FLOAT,
          isIndexed: false
        }
      });

      delaunayModel.render({
        bbox: [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat],
        size: [width, height]
      });

      gl.bindTexture(gl.TEXTURE_2D, txt);

      // read texture back
      const pixels = new Float32Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, pixels);

      // let imageData = new Uint8ClampedArray(width * height * 4);
      // for (let i = 0; i < pixels.length; i+=4) {
      //   imageData[i] = Math.abs(Math.floor(pixels[i]));
      //   imageData[i+1] = Math.abs(Math.floor(pixels[i+1]));
      //   imageData[i+2] = Math.abs(Math.floor(pixels[i+2]));
      //   imageData[i+3] = 255;
      // }
      // let id = new ImageData(imageData, width, height);
      // createImageBitmap(id).then((ib) => {
      //   let canvas = document.createElement('canvas');
      //   canvas.width = width;
      //   canvas.height = height;
      //   canvas.getContext('2d').drawImage(ib, 0, 0);
      //   canvas.style.position = 'absolute';
      //   canvas.style.zIndex = '100000';
      //   document.body.appendChild(canvas);
      // });

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      return pixels;
    });

    return {fb, rb, txt, bounds, textures};
  }

  countVertices(data) {
    debugger;
    // if (!data) {
    //   return;
    // }

    // const {getPath} = this.props;
    // let vertexCount = 0;
    // const pathLengths = data.reduce((acc, d) => {
    //   const l = getPath(d).length;
    //   vertexCount += l;
    //   return [...acc, l];
    // }, []);
    // this.setState({pathLengths, vertexCount});
  }

  updateUniforms() {
    // const {opacity, trailLength, currentTime} = this.props;
  }

  calculateIndices(attribute) {

  }

  calculatePositions(attribute) {

  }

  calculateColors(attribute) {

  }

  // setUniforms() {

  // }
}