import { describe, expect, it } from 'vitest';
import { diagnoseRasterFor04Nozzle } from './svg-printability';

function image(w: number, h: number, spots: Array<[number,number]>) {
  const a = new Uint8ClampedArray(w*h*4);
  for (let p=0; p<w*h; p++) { a[p*4]=255; a[p*4+1]=255; a[p*4+2]=255; a[p*4+3]=255; }
  for (const [x,y] of spots) { const k=(y*w+x)*4; a[k]=0; a[k+1]=0; a[k+2]=0; }
  return a;
}
describe('SVG printability preflight', () => {
  it('flags narrow strokes for a 0.4 mm nozzle profile', () => {
    const a=image(8,8,[[1,1],[1,2],[1,3]]);
    const r=diagnoseRasterFor04Nozzle(a,8,8,{mmPerPixel:0.2});
    expect(r.components).toHaveLength(1);
    expect(r.components[0].issues).toContain('thin-stroke');
    expect(r.components[0].suggestedStrokeIncreaseMm).toBeCloseTo(0.25);
  });
  it('accepts a larger block', () => {
    const points: Array<[number,number]> = [];
    for(let y=2;y<7;y++) for(let x=2;x<7;x++) points.push([x,y]);
    const r=diagnoseRasterFor04Nozzle(image(10,10,points),10,10,{mmPerPixel:0.2});
    expect(r.components[0].issues).toEqual([]);
  });
  it('rejects invalid dimensions', () => {
    expect(()=>diagnoseRasterFor04Nozzle(new Uint8ClampedArray(3),2,2,{mmPerPixel:0.1})).toThrow();
  });
});
