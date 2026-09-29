/** Calibration between the original simulation and the approved painted board.
 * Rows are [world z, art y, art origin x, pixels per world x].
 * No rendering or game state is stored here; projection is invertible.
 */
export const ART = Object.freeze({ width:1536, height:960 });
export const SCENE_ROWS = Object.freeze([
  [-14,95,866,34],[-10.3,217,852,35.6],[-1.7,410,818,37.2],
  [0,459,814,38],[2.5,550,797,38],[6,634,755,41],
  [7,681,742,43],[8.9,713,718,44],[9.75,735,701,44.8],
  [14,870,620,48],[17.5,981,588,50],
]);
export function interpolateRow(value,column=0){
  let i=0;
  while(i<SCENE_ROWS.length-2 && value>SCENE_ROWS[i+1][column])i++;
  const a=SCENE_ROWS[i],b=SCENE_ROWS[i+1],t=(value-a[column])/(b[column]-a[column]);
  return a.map((v,j)=>v+(b[j]-v)*t);
}
export function worldToArt(x,z){const r=interpolateRow(z);return {x:r[2]+x*r[3],y:r[1]};}
export function artToWorld(x,y){const r=interpolateRow(y,1);return {x:(x-r[2])/r[3],z:r[0]};}
export function sceneLayout(width,height){
  const compact=width<1000 || height<620, portrait=height>width;
  if(!compact)return {compact,portrait,viewport:{x:0,y:0,w:width,h:height},hudScale:Math.min(width/ART.width,height/ART.height)};
  if(portrait)return {compact,portrait,viewport:{x:0,y:206,w:width,h:Math.max(140,height-206-140)},hudScale:1};
  return {compact,portrait,viewport:{x:198,y:77,w:Math.max(220,width-210),h:Math.max(100,height-77-94)},hudScale:1};
}
