/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import {
  BaseItemState,
  CommandItemDef,
  ContentGroup, ContentViewManager, CoreTools, Frontstage, FrontstageProps, FrontstageProvider, GroupItemDef, ItemList, NavigationWidget,
  SelectionContextToolDefinitions,
  SessionStateActionId,
  SyncUiEventId,
  ToolWidget, UiFramework, Widget, Zone, ZoneState,
} from "@itwin/appui-react";
import { AppTools } from "../../tools/ToolSpecifications";
import { TreeExampleContentControl } from "../contentviews/TreeExampleContent";
import { SmallStatusBarWidgetControl } from "../statusbars/SmallStatusBar";
import {
  HorizontalPropertyGridContentControl, HorizontalPropertyGridWidgetControl,
} from "../widgets/PropertyGridDemoWidget";
import { IModelApp } from "@itwin/core-frontend";
import { ConditionalBooleanValue, StandardContentLayouts, WidgetState } from "@itwin/appui-abstract";

/* eslint-disable react/jsx-key, deprecation/deprecation */

export class Frontstage2 extends FrontstageProvider {
  public static stageId = "ui-test-app:Test2";

  public get id(): string {
    return Frontstage2.stageId;
  }

  public get frontstage(): React.ReactElement<FrontstageProps> {
    const myContentGroup: ContentGroup = new ContentGroup(
      {
        id: "frontstage2",
        layout: StandardContentLayouts.fourQuadrants,
        contents: [
          {
            id: "imodelView1",
            classId: "UiFramework.IModelViewportControl",
            applicationData: { label: "Content 1a", bgColor: "black" },
          },
          {
            id: "treeView",
            classId: TreeExampleContentControl,
            applicationData: { label: "Content 2a", bgColor: "black" },
          },
          {
            id: "imodelView2",
            classId: "TestApp.IModelViewport",
            applicationData: { label: "Content 3a", bgColor: "black" },
          },
          {
            id: "gridView",
            classId: HorizontalPropertyGridContentControl,
            applicationData: { label: "Content 4a", bgColor: "black" },
          },
        ],
      },
    );

    return (
      <Frontstage id={this.id}
        defaultTool={CoreTools.selectElementCommand}
        contentGroup={myContentGroup}
        applicationData={{ key: "value" }}

        contentManipulationTools={
          <Zone
            widgets={[
              <Widget isFreeform={true} element={<FrontstageToolWidget />} />,
            ]}
          />
        }
        toolSettings={
          <Zone
            widgets={[
              <Widget isToolSettings={true} />,
            ]}
          />
        }
        viewNavigationTools={
          <Zone
            widgets={[
              <Widget isFreeform={true} element={<FrontstageNavigationWidget />} />,
            ]}
          />
        }
        statusBar={
          <Zone defaultState={ZoneState.Open}
            widgets={[
              <Widget isStatusBar={true} control={SmallStatusBarWidgetControl} />,
            ]}
          />
        }
        bottomRight={
          <Zone allowsMerging={true} defaultState={ZoneState.Minimized}
            widgets={[
              <Widget defaultState={WidgetState.Hidden} iconSpec="icon-placeholder" labelKey="SampleApp:widgets.HorizontalPropertyGrid" control={HorizontalPropertyGridWidgetControl} />,
            ]}
          />
        }
      />
    );
  }
}

function getSelectionContextSyncEventIds(): string[] {
  return [SyncUiEventId.SelectionSetChanged, SyncUiEventId.ActiveContentChanged, SyncUiEventId.ActiveViewportChanged, SessionStateActionId.SetNumItemsSelected];
}

function isSelectionSetEmpty(): boolean {
  const activeContentControl = ContentViewManager.getActiveContentControl();
  let selectionCount = 0;
  if (!UiFramework.frameworkStateKey)
    selectionCount = UiFramework.store.getState()[UiFramework.frameworkStateKey].frameworkState.sessionState.numItemsSelected;

  if (activeContentControl && activeContentControl.viewport
    && (activeContentControl.viewport.view.iModel.selectionSet.size > 0 || selectionCount > 0))
    return false;
  return true;
}

function selectionContextStateFunc(state: Readonly<BaseItemState>): BaseItemState {
  const isVisible = !isSelectionSetEmpty();
  return { ...state, isVisible };
}

function getIsHiddenIfSelectionNotActive(): ConditionalBooleanValue {
  return new ConditionalBooleanValue(isSelectionSetEmpty, getSelectionContextSyncEventIds());
}

/** Define a ToolWidget with Buttons to display in the TopLeft zone.
 */
class FrontstageToolWidget extends React.Component {
  // example toolbar item that hides/shows based on selection set
  public get myClearSelectionItemDef() {
    return new CommandItemDef({
      commandId: "UiFramework.ClearSelection",
      iconSpec: "icon-selection-clear",
      labelKey: "UiFramework:buttons.clearSelection",
      stateSyncIds: getSelectionContextSyncEventIds(), /* only used when in ui 1.0 mode */
      stateFunc: selectionContextStateFunc,  /* only used when in ui 1.0 mode */
      isHidden: getIsHiddenIfSelectionNotActive(),  /* only used when in ui 2.0 mode */
      execute: async () => {
        const iModelConnection = UiFramework.getIModelConnection();
        if (iModelConnection) {
          iModelConnection.selectionSet.emptyAll();
        }
        const tool = IModelApp.toolAdmin.primitiveTool;
        if (tool)
          await tool.onRestartTool();
        else
          await IModelApp.toolAdmin.startDefaultTool();
      },
    });
  }

  private get _horizontalToolbarItems(): ItemList {
    const items = new ItemList([
      SelectionContextToolDefinitions.clearHideIsolateEmphasizeElementsItemDef,
      SelectionContextToolDefinitions.hideSectionToolGroup,
      SelectionContextToolDefinitions.isolateSelectionToolGroup,
      SelectionContextToolDefinitions.emphasizeElementsItemDef,
      AppTools.item1,
      AppTools.item2,
      new GroupItemDef({
        groupId: "SampleApp:buttons-toolGroup",
        labelKey: "SampleApp:buttons.toolGroup",
        iconSpec: "icon-symbol",
        items: [AppTools.tool1, AppTools.tool2],
        itemsInColumn: 7,
      }),
    ]);
    return items;
  }

  private get _verticalToolbarItems(): ItemList {
    const items = new ItemList([AppTools.item3, AppTools.item4, AppTools.item5, AppTools.item6, AppTools.item7, AppTools.item8]);
    return items;
  }

  public override render() {
    return (
      <ToolWidget
        appButton={AppTools.backstageToggleCommand}
        horizontalItems={this._horizontalToolbarItems}
        verticalItems={this._verticalToolbarItems}
      />
    );
  }
}

/** Define a NavigationWidget with Buttons to display in the TopRight zone.
 */
class FrontstageNavigationWidget extends React.Component {
  public override render() {
    const horizontalItems = new ItemList([
      CoreTools.fitViewCommand,
      CoreTools.windowAreaCommand,
      CoreTools.zoomViewCommand,
      CoreTools.panViewCommand,
      CoreTools.rotateViewCommand,
    ]);

    const verticalItems = new ItemList([
      CoreTools.toggleCameraViewCommand,
    ]);

    return (
      <NavigationWidget
        horizontalItems={horizontalItems}
        verticalItems={verticalItems}
      />
    );
  }
}
