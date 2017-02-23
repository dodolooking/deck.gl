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
#define EPSILON 0.01

uniform sampler2D dataFrom;
uniform sampler2D dataTo;
uniform float delta;

uniform float flip;
uniform vec4 bbox;
uniform vec2 bounds0;
uniform vec2 bounds1;
uniform vec2 bounds2;

attribute vec3 positions;
attribute vec4 posFrom;

float rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main(void) {
  // position in texture coords
  float x = (posFrom.x - bbox.x) / (bbox.y - bbox.x);
  float y = (posFrom.y - bbox.z) / (bbox.w - bbox.z);
  vec2 coord = vec2(x, 1. - y);
  vec4 texel = mix(texture2D(dataFrom, coord), texture2D(dataTo, coord), delta);
  
  // angle
  float angle = texel.x * PI4;

  // wind speed in 0-1
  float wind = (texel.y - bounds1.x) / (bounds1.y - bounds1.x);
  vec2 offset = vec2(cos(angle), sin(angle)) * wind * 0.2;
  vec2 offsetPos = posFrom.xy * .1 + (posFrom.xy + offset) * .9;

  vec4 endPos = vec4(offsetPos, posFrom.zw);

  // if out of bounds then map to initial position
  // TODO(nico): change this to a random pos in bbox
  // vec2 randValues = vec2(randLng, randLat);
  float r1 = rand(vec2(posFrom.z, offsetPos.x));
  float r2 = rand(vec2(posFrom.w, offsetPos.y));
  r1 = r1 * (bbox.y - bbox.x) + bbox.x;
  r2 = r2 * (bbox.w - bbox.z) + bbox.z;
  vec2 randValues = vec2(r1, r2);

  // endPos = vec4(offsetPos, randValues);
  endPos.xy = mix(offsetPos, randValues, float(offsetPos.x < bbox.x || offsetPos.x > bbox.y || offsetPos.y < bbox.z || offsetPos.y > bbox.w));
  endPos.xy = mix(endPos.xy, randValues, float(length(offset) < EPSILON));
  endPos.xy = mix(endPos.xy, randValues, abs(flip - posFrom.z) < EPSILON ? 1. : 0.);

  gl_Position = endPos;
}
`;