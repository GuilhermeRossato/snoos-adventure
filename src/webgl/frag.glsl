precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texcoord;
varying vec4 v_tint; // rgb + weight
void main() {
  vec4 tex = texture2D(u_texture, v_texcoord);
  // blend texture color with tint RGB using weight in v_tint.a
  // result = mix(tex.rgb, tint.rgb, weight), preserve original alpha
  vec3 blended = mix(tex.rgb, v_tint.rgb, 0.5);
  gl_FragColor = vec4(blended, tex.a);
}