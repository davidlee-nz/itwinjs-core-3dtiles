/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
import * as path from "path";
import { assert } from "chai";
import { OpenMode, ChangeSetApplyOption, ChangeSetStatus } from "@bentley/bentleyjs-core";
import { AccessToken } from "@bentley/imodeljs-clients";
import { IModelDb } from "../../backend";
import { IModelTestUtils } from "../IModelTestUtils";
import { HubUtility } from "./HubUtility";
import { ChangeSetToken } from "../../BriefcaseManager";
import { KnownLocations } from "../../Platform";
import { Logger, LogLevel } from "@bentley/bentleyjs-core";

// Useful utilities to download/upload test cases from/to the iModel Hub
describe("ApplyChangeSets (#integration)", () => {
  let accessToken: AccessToken;
  const iModelRootDir = path.join(KnownLocations.tmpdir, "IModelJsTest/");

  before(async () => {
    accessToken = await IModelTestUtils.getTestUserAccessToken();

    // Note: Change to LogLevel.Info for useful debug information
    Logger.setLevel(HubUtility.logCategory, LogLevel.Error);
    Logger.setLevel("DgnCore", LogLevel.Error);
    Logger.setLevel("BeSQLite", LogLevel.Error);
  });

  const testAllChangeSetOperations = async (projectName: string, iModelName: string) => {
    const iModelDir = path.join(iModelRootDir, iModelName);

    Logger.logInfo(HubUtility.logCategory, "Downloading seed file and all available change sets");
    await HubUtility.downloadIModelByName(accessToken, projectName, iModelName, iModelDir);

    const seedPathname = HubUtility.getSeedPathname(iModelDir);
    const iModelPathname = path.join(iModelDir, path.basename(seedPathname));

    Logger.logInfo(HubUtility.logCategory, "Creating standalone iModel");
    HubUtility.createStandaloneIModel(iModelPathname, iModelDir);
    const iModel: IModelDb = IModelDb.openStandalone(iModelPathname, OpenMode.ReadWrite);

    const changeSets: ChangeSetToken[] = HubUtility.readChangeSets(iModelDir);

    let status: ChangeSetStatus;

    // Logger.logInfo(HubUtility.logCategory, "Dumping all available change sets");
    // HubUtility.dumpStandaloneChangeSets(iModel, changeSets);

    Logger.logInfo(HubUtility.logCategory, "Merging all available change sets");
    status = HubUtility.applyStandaloneChangeSets(iModel, changeSets, ChangeSetApplyOption.Merge);

    if (status === ChangeSetStatus.Success) {
      Logger.logInfo(HubUtility.logCategory, "Reversing all available change sets");
      changeSets.reverse();
      status = HubUtility.applyStandaloneChangeSets(iModel, changeSets, ChangeSetApplyOption.Reverse);
    }

    if (status === ChangeSetStatus.Success) {
      Logger.logInfo(HubUtility.logCategory, "Reinstating all available change sets");
      changeSets.reverse();
      status = HubUtility.applyStandaloneChangeSets(iModel, changeSets, ChangeSetApplyOption.Reinstate);
    }

    iModel.closeStandalone();
    assert(status === ChangeSetStatus.Success, "Error applying change sets");
  };

  it("should test all change set operations after downloading iModel from the hub", async () => {
    console.log(`Downloading/Uploading iModels to/from ${iModelRootDir}`); // tslint:disable-line:no-console
    await testAllChangeSetOperations("iModelJsTest", "ReadOnlyTest");
    await testAllChangeSetOperations("iModelJsTest", "ReadWriteTest");
    await testAllChangeSetOperations("iModelJsTest", "NoVersionsTest");
    await testAllChangeSetOperations("NodeJsTestProject", "TestModel");
    await testAllChangeSetOperations("SampleBisPlant", "samplePlant20");
    // await testAllChangeSetOperations("iModelHubTest", "Office Building4"); Fails due to an assertion DgnGeoCoord
    // await testAllChangeSetOperations("AbdTestProject", "ATP_2018050310145994_scenario22"); Waiting for new Db after converter fix
  });

});
