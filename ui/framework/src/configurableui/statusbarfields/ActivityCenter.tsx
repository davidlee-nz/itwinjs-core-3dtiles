/*---------------------------------------------------------------------------------------------
| $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
/** @module Notification */

import * as React from "react";

import "../configurableui.scss";

import { StatusBarFieldId, IStatusBar } from "../StatusBarWidgetControl";

import Status from "@bentley/ui-ninezone/lib/footer/message/content/status/Status";
import StatusLayout from "@bentley/ui-ninezone/lib/footer/message/content/status/Layout";
import Progress from "@bentley/ui-ninezone/lib/footer/message/content/Progress";
import { MessageManager, ActivityMessageEventArgs } from "../MessageManager";

export interface ActivityCenterProps {
  statusBar: IStatusBar;
  isInFooterMode: boolean;
  openWidget: StatusBarFieldId;
}

export interface ActivityCenterState {
  title: string;
  percentage: number;
  isActivityMessageVisible: boolean;
}

/** Activity Center Field React component.
 */
export class ActivityCenterField extends React.Component<ActivityCenterProps, ActivityCenterState> {
  private _element: any;

  constructor(p: ActivityCenterProps) {
    super(p);
    this.state = {
      title: "",
      percentage: 0,
      isActivityMessageVisible: true,
    };
  }

  public componentDidMount() {
    MessageManager.onActivityMessageAddedEvent.addListener(this._handleActivityMessageEvent);
    MessageManager.onActivityMessageCanceledEvent.addListener(this._handleActivityMessageCanceledEvent);
  }

  public componentWillUnmount() {
    MessageManager.onActivityMessageAddedEvent.removeListener(this._handleActivityMessageEvent);
    MessageManager.onActivityMessageCanceledEvent.removeListener(this._handleActivityMessageCanceledEvent);
  }

  private _handleActivityMessageEvent = (args: ActivityMessageEventArgs) => {
    this.setState((_prevState) => ({
      title: args.title,
      percentage: args.percentage,
      isActivityMessageVisible: true,
    }));
  }

  private _handleActivityMessageCanceledEvent = () => {
    this.setState((_prevState) => ({
      isActivityMessageVisible: false,
    }));
  }

  private _openActivityMessage = () => {
    MessageManager.setupActivityMessageValues(this.state.title, this.state.percentage, true);
    this.setState((_prevState) => ({
      isActivityMessageVisible: true,
    }));
  }

  public render(): React.ReactNode {
    let footerMessages: React.ReactNode;
    const isPercentageValid = (this.state.percentage === 0 || this.state.percentage === 100) ? false : true;
    if (this.state.isActivityMessageVisible && isPercentageValid) {
      footerMessages = (
        <div className="centered" onClick={this._openActivityMessage}>
          <StatusLayout
            progress={
              <Progress
                status={Status.Information}
                progress={this.state.percentage}
              />
            }
          />
        </div>
      );
    } else {
      footerMessages = (<div />);
    }
    this.props.statusBar.setFooterMessages(this._element);
    return footerMessages;
  }
}
