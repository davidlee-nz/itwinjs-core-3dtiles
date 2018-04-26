/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
/** @module Geometry */

import { Vector3d, XYZProps, YawPitchRollProps, YawPitchRollAngles, Transform } from "@bentley/geometry-core";
import { Id64 } from "@bentley/bentleyjs-core";

export namespace LineStyle {

  /** GeometryStream entry to modify the line style appearance without changing the line style definition.
   * Applies to the style previously established by a GeometryAppearanceProps or current subCategory appearance.
   * Most of the modifiers affect the line style stroke pattern, with the orientation and scales being the exception.
   */
  export interface ModifierProps {
    /** Optional scale to apply to all length values */
    scale?: number;
    /** Optional scale to apply to scalable dashes */
    dashScale?: number;
    /** Optional scale to apply to scalable gaps */
    gapScale?: number;
    /** Optional start width in meters to apply to dashes */
    startWidth?: number;
    /** Optional end width in meters to apply to dashes */
    endWidth?: number;
    /** Optional shift by distance in meters */
    distPhase?: number;
    /** Optional shift by fraction */
    fractPhase?: number;
    /** Optional flag to center stroke pattern and stretch ends */
    centerPhase?: boolean;
    /** Optional flag to enable or disable single segment mode */
    segmentMode?: boolean;
    /** Optional flag that denotes startWidth and endWidth represent physical widths that should not be affected by scale */
    physicalWidth?: boolean;
    /** Optional up vector for style (applicable to 3d only) */
    normal?: XYZProps;
    /** Optional orientation for style (applicable to 3d only) */
    rotation?: YawPitchRollProps;
  }

  /** Optional modifiers to override line style definition */
  export class Modifier implements ModifierProps {
    public scale?: number;
    public dashScale?: number;
    public gapScale?: number;
    public startWidth?: number;
    public endWidth?: number;
    public distPhase?: number;
    public fractPhase?: number;
    public centerPhase?: boolean;
    public segmentMode?: boolean;
    public physicalWidth?: boolean;
    public normal?: Vector3d;
    public rotation?: YawPitchRollAngles;

    /** constructor for LineStyle.Modifier */
    constructor(props: ModifierProps) {
      this.scale = props.scale;
      this.dashScale = props.dashScale;
      this.gapScale = props.gapScale;
      this.startWidth = props.startWidth;
      this.endWidth = props.endWidth;
      this.distPhase = props.distPhase;
      this.fractPhase = props.fractPhase;
      this.centerPhase = props.centerPhase;
      this.segmentMode = props.segmentMode;
      this.physicalWidth = props.physicalWidth;
      this.normal = props.normal ? Vector3d.fromJSON(props.normal) : undefined;
      this.rotation = props.rotation ? YawPitchRollAngles.fromJSON(props.rotation) : undefined;
    }

    /** Add properties to an object for serializing to JSON */
    public toJSON(): ModifierProps {
      return this.toJSON() as ModifierProps;
    }

    /** Returns a deep copy of this object. */
    public clone() {
      return new Modifier(this.toJSON());
    }

    /** Compare two LineStyle.Modifier for equivalence */
    public isEqualTo(other: Modifier): boolean {
      if (this === other)   // same pointer
        return true;

      if (other.scale !== this.scale ||
        other.dashScale !== this.dashScale ||
        other.gapScale !== this.gapScale ||
        other.startWidth !== this.startWidth ||
        other.endWidth !== this.endWidth ||
        other.distPhase !== this.distPhase ||
        other.fractPhase !== this.fractPhase ||
        other.centerPhase !== this.centerPhase ||
        other.segmentMode !== this.segmentMode ||
        other.physicalWidth !== this.physicalWidth)
        return false;

      if ((this.normal === undefined) !== (other.normal === undefined))
        return false;
      if (this.normal && !this.normal.isAlmostEqual(other.normal!))
        return false;

      if ((this.rotation === undefined) !== (other.rotation === undefined))
        return false;
      if (this.rotation && !this.rotation.isAlmostEqual(other.rotation!))
        return false;

      return true;
    }

    public applyTransform(transform: Transform): boolean {
      if (transform.isIdentity())
        return true;
      if (this.normal) {
        transform.matrix.multiplyVector(this.normal, this.normal);
        const normalized = this.normal.normalize();
        if (normalized)
          this.normal.setFrom(normalized);
        else
          return false;
      }
      if (this.rotation) {
        const newTransform = this.rotation.toRotMatrix().multiplyMatrixTransform(transform);
        const scales = new Vector3d();
        if (!newTransform.matrix.normalizeColumnsInPlace(scales))
          return false;
        const newRotation = YawPitchRollAngles.createFromRotMatrix(newTransform.matrix);
        if (undefined === newRotation)
          return false;
        this.rotation.setFrom(newRotation);
      }

      let scaleFactor = 1.0;
      const scaleVector = Vector3d.create();
      const scaleMatrix = transform.matrix;
      scaleMatrix.normalizeRowsInPlace(scaleVector);

      // Check for flatten transform, dividing scaleVector by 3 gives wrong scaleFactor
      if (scaleVector.x !== 0.0 && scaleVector.y !== 0.0 && scaleVector.z !== 0.0)
        scaleFactor = (scaleVector.x + scaleVector.y + scaleVector.z) / 3.0;
      else
        scaleFactor = (scaleVector.x + scaleVector.y + scaleVector.z) / 2.0;

      if (1.0 === scaleFactor)
        return true;

      if (this.scale)
        this.scale *= scaleFactor;

      if (this.physicalWidth)
        return true;

      if (this.startWidth)
        this.startWidth *= scaleFactor;

      if (this.endWidth)
        this.endWidth *= scaleFactor;

      return true;
    }
  }

  /** Line style id and optional modifiers to override line style definition */
  export class Info {
    public styleId: Id64;
    public styleMod?: Modifier; // Optional modifiers to override line style definition

    private constructor(styleId: Id64, styleMod?: Modifier) {
      this.styleId = styleId;
      this.styleMod = styleMod;
    }

    /** Creates a LineStyleInfo object */
    public static create(styleId: Id64, styleMod?: Modifier): Info {
      return new Info(styleId, styleMod);
    }

    /** Returns a deep copy of this object. */
    public clone(): Info {
      return new Info(this.styleId, this.styleMod ? this.styleMod.clone() : undefined);
    }

    public isEqualTo(other: Info): boolean {
      if (this === other)
        return true;
      if (!this.styleId.equals(other.styleId))
        return false;
      if ((this.styleMod === undefined) !== (other.styleMod === undefined))
        return false;
      if (this.styleMod && !this.styleMod.isEqualTo(other.styleMod!))
        return false;
      return true;
    }
  }
}
