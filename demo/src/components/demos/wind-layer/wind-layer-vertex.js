export default `
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

#define SHADER_NAME wind-layer-vertex-shader

#define PI2 1.5707963267949
#define PI4 0.78539816339745
#define HEIGHT_FACTOR 25.
#define ELEVATION_SCALE 80.

uniform sampler2D dataFrom;
uniform sampler2D dataTo;
uniform float delta;

uniform vec4 bbox;
uniform vec2 size;
uniform vec2 bounds0;
uniform vec2 bounds1;
uniform vec2 bounds2;

attribute vec3 positions;
attribute vec3 vertices;
attribute vec3 normals;

varying vec4 vPosition;
varying vec4 vNormal;
varying vec4 vColor;

vec3 getRGB(float h, float s, float v) {
  float c = v * s;
  h /= 60.;
  float x = c * (1. - abs( mod(h, 2.) - 1. ));
  vec3 rgbp;

  if (h < 1.) {
    rgbp = vec3(c, x, 0);
  } else if (h < 2.) {
    rgbp = vec3(x, c, 0);
  } else if (h < 3.) {
    rgbp = vec3(0, c, x);
  } else if (h < 4.) {
    rgbp = vec3(0, x, c);
  } else if (h < 5.) {
    rgbp = vec3(x, 0, c);
  } else {
    rgbp = vec3(c, 0, x);
  }

  float m = v - c;

  return rgbp + vec3(m);
}

void main(void) {
  // position in texture coords
  float x = (positions.x - bbox.x) / (bbox.y - bbox.x);
  float y = (positions.y - bbox.z) / (bbox.w - bbox.z);
  vec2 coord = vec2(x, 1. - y);
  vec4 texel = mix(texture2D(dataFrom, coord), texture2D(dataTo, coord), delta);
  
  // angle
  float angle = texel.x * PI4;
  mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

  // wind speed in 0-1
  float wind = (texel.y - bounds1.x) / (bounds1.y - bounds1.x);
  float factor = wind * 3.;
  vec2 vertex = rotation * vertices.xy;
  vec2 normal = rotation * normals.xy;
  vec2 pos = project_position(positions.xy + vertex.xy * factor);
  float elevation = project_scale((vertices.z + texel.w) * ELEVATION_SCALE);
  vec3 extrudedPosition = vec3(pos.xy, elevation + 1.0);
  vec4 position_worldspace = vec4(extrudedPosition, 1.0);
  gl_Position = project_to_clipspace(position_worldspace);

  float lightWeight = 1.0;
  // temperature in 0-1
  float temp = (texel.z - bounds2.x) / (bounds2.y - bounds2.x);  
  vPosition = position_worldspace;
  vNormal = vec4(normal, normals.z, 1);
  float wheel = floor((1. - temp) * 360. / 40.) * 40.;
  vColor = vec4(getRGB(wheel, 1., 1.), 1);
}
`;