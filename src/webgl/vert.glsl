
attribute vec2 a_position;
attribute vec2 a_texcoord;
attribute vec4 a_tint;
varying vec2 v_texcoord;
varying vec4 v_tint;
void main() {
  v_texcoord = a_texcoord;
  v_tint = a_tint;
  gl_Position = vec4(a_position, 0.0, 1.0);
}