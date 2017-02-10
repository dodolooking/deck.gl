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

#define SHADER_NAME delaunay-cover-vertex-shader
#define HEIGHT_FACTOR 25.

uniform vec2 bounds;

attribute vec3 positions;
attribute vec3 next;
attribute vec3 next2;

varying vec4 vColor;


void main(void) {
  vec3 position_modelspace = project_position(positions);
  gl_Position = project( vec4(preproject(positions.xy), positions.z / HEIGHT_FACTOR, 1. ));

  vec2 p = preproject(positions.xy);

  vec2 p2 = preproject(next.xy);
  vec4 pos2 = project(vec4(p2, next.z / HEIGHT_FACTOR, 1.));

  vec2 p3 = preproject(next2.xy);
  vec4 pos3 = project(vec4(p3, next2.z / HEIGHT_FACTOR, 1.));

  vec4 a = pos2 - gl_Position;
  vec4 b = pos3 - gl_Position;
  vec3 normal = normalize(cross(a.xyz, b.xyz));

  vec3 litColor = lighting_filterColor(position_modelspace, normal, vec3(1, 0.25, 0.4));

  vColor = vec4(litColor, (positions.z - bounds.x) / (bounds.y - bounds.x));
}
`;