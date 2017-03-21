// Copyright (c) YugaByte, Inc.

import React, { Component } from 'react';
import { Link } from 'react-router';
import { Grid, Row, Col, ButtonGroup, DropdownButton, MenuItem, Tab } from 'react-bootstrap';
import { UniverseInfoPanel, ConnectStringPanel, ResourceStringPanel } from '../../panels'
import { GraphPanelContainer, GraphPanelHeaderContainer } from '../../metrics';
import { TaskProgressContainer, TaskListTable } from '../../tasks';
import { RollingUpgradeFormContainer } from 'components/common/forms';
import { UniverseFormContainer, UniverseStatusContainer, NodeDetails, DeleteUniverseContainer } from '../../universes';
import { YBButton } from '../../common/forms/fields';
import { YBLabelWithIcon } from '../../common/descriptors';
import { YBTabsPanel } from '../../panels';
import { RegionMap } from '../../maps';
import { ListTablesContainer } from '../../tables';
import { YBMapLegend } from '../../maps';
import {isValidObject, isValidArray} from '../../../utils/ObjectUtils';
import {YBLoadingIcon} from '../../common/indicators';
import './UniverseDetail.scss';

export default class UniverseDetail extends Component {

  componentWillUnmount() {
    this.props.resetUniverseInfo();
    this.props.resetUniverseTasks();
  }

  componentDidMount() {
    var uuid ;
    if (typeof this.props.universeSelectionId !== "undefined") {
      uuid = this.props.universeUUID;
    } else {
      uuid = this.props.uuid;
    }
    this.props.getUniverseInfo(uuid);
    this.props.fetchUniverseTasks(uuid);
  }

  render() {
    const { universe: { currentUniverse, loading, showModal, visibleModal }, universe } = this.props;
    if (loading) {
      return <YBLoadingIcon/>
    } else if (!currentUniverse) {
      return <span />;
    }

    var tabElements = [
      <Tab eventKey={"overview"} title="Overview" key="overview-tab">
        <Row>
          <Col lg={4}>
            <UniverseInfoPanel universeInfo={currentUniverse}
                               customerId={localStorage.getItem("customer_id")} />
          </Col>
          <Col lg={3}>
            <ResourceStringPanel customerId={localStorage.getItem("customer_id")}
                                universeInfo={currentUniverse} />
          </Col>
          <Col lg={5}>
            <ConnectStringPanel customerId={localStorage.getItem("customer_id")}
                                universeInfo={currentUniverse} />
          </Col>
        </Row>
        <Row>
          <Col lg={12}>
            <RegionMap regions={currentUniverse.regions} type={"Root"} />
            <YBMapLegend title="Placement Policy" regions={currentUniverse.regions}/>
          </Col>
        </Row>
      </Tab>,
      <Tab eventKey={"tables"} title="Tables" key="tables-tab">
        <ListTablesContainer/>
      </Tab>,
      <Tab eventKey={"nodes"} title="Nodes" key="nodes-tab">
        <NodeDetails nodeDetails={currentUniverse.universeDetails.nodeDetailsSet}/>
      </Tab>,
      <Tab eventKey={"metrics"} title="Metrics" key="metrics-tab">
        <GraphPanelHeaderContainer origin={"universe"}>
          <GraphPanelContainer
            type={"cql"}
            nodePrefixes={[currentUniverse.universeDetails.nodePrefix]} />
          <GraphPanelContainer
            type={"redis"}
            nodePrefixes={[currentUniverse.universeDetails.nodePrefix]} />
          <GraphPanelContainer
            type={"tserver"}
            nodePrefixes={[currentUniverse.universeDetails.nodePrefix]} />
          <GraphPanelContainer
            type={"lsmdb"}
            nodePrefixes={[currentUniverse.universeDetails.nodePrefix]} />
          <GraphPanelContainer
            type={"server"}
            nodePrefixes={[currentUniverse.universeDetails.nodePrefix]} />
        </GraphPanelHeaderContainer>
      </Tab>,
      <Tab eventKey={"tasks"} title="Tasks" key="tasks-tab">
        <UniverseTaskList universe={universe}/>

      </Tab>]

    return (
      <Grid id="page-wrapper" fluid={true}>
        <Row>
          <Col lg={10}>
            <div className="detail-label-small">
              <Link to="/universes">
                <YBLabelWithIcon icon="fa fa-chevron-left fa-fw">
                  Universes
                </YBLabelWithIcon>
              </Link>
            </div>
            <div className="universe-detail-status-container">
              <h2>
                { currentUniverse.name }
              </h2>
              <UniverseStatusContainer currentUniverse={currentUniverse} showLabelText={true} />
            </div>
          </Col>
          <Col lg={2} className="page-action-buttons">
            <ButtonGroup className="universe-detail-btn-group">
              <YBButton btnClass=" btn btn-default bg-orange"
                        btnText="Edit" btnIcon="fa fa-database" onClick={this.props.showUniverseModal} />

              <DropdownButton className="btn btn-default" title="More" id="bg-nested-dropdown" pullRight>
                <MenuItem eventKey="1" onClick={this.props.showSoftwareUpgradesModal}>

                  <YBLabelWithIcon icon="fa fa-refresh fa-fw">
                    Upgrade Software
                  </YBLabelWithIcon>
                </MenuItem>
                <MenuItem eventKey="2" onClick={this.props.showGFlagsModal} >
                  <YBLabelWithIcon icon="fa fa-flag fa-fw">
                    Show GFlags
                  </YBLabelWithIcon>
                </MenuItem>
                <MenuItem eventKey="2" onClick={this.props.showDeleteUniverseModal} >
                  <YBLabelWithIcon icon="fa fa-trash-o fa-fw">
                    Delete Universe
                  </YBLabelWithIcon>
                </MenuItem>
              </DropdownButton>
            </ButtonGroup>
          </Col>
          <UniverseFormContainer type="Edit"
                                 visible={showModal===true && visibleModal==="universeModal"}
                                 onHide={this.props.closeModal} title="Edit Universe" />
          <RollingUpgradeFormContainer modalVisible={showModal === true &&
          (visibleModal === "gFlagsModal" || visibleModal ==="softwareUpgradesModal")}
                                       onHide={this.props.closeModal} />
          <DeleteUniverseContainer visible={showModal===true && visibleModal==="deleteUniverseModal"}
                                       onHide={this.props.closeModal} title="Delete Universe"/>
        </Row>
        <YBTabsPanel activeTab={"overview"} id={"universe-tab-panel"}>
          { tabElements }
        </YBTabsPanel>
      </Grid>
    );
  }
}

class UniverseTaskList extends Component {

  render() {
    const {universe: {universeTasks, currentUniverse}} = this.props;
    var universeTaskUUIDs = [];
    var universeTaskHistoryArray = [];
    var universeTaskHistory = <span/>;
    if (isValidObject(universeTasks) && isValidObject(currentUniverse) && universeTasks[currentUniverse.universeUUID] !== undefined) {
      universeTaskUUIDs = universeTasks[currentUniverse.universeUUID].map(function(task) {
        if (task.status !== "Running") {
          universeTaskHistoryArray.push(task);
        }
        return (task.status !== "Failed" && task.percentComplete !== 100) ? task.id : false;
      }).filter(Boolean);
    }
    if (isValidArray(universeTaskHistoryArray)) {
      universeTaskHistory = <TaskListTable taskList={universeTaskHistoryArray} title={"Task History"}/>
    }

    return (
      <div>
        <TaskProgressContainer taskUUIDs={universeTaskUUIDs} type="StepBar"/>
        {universeTaskHistory}
      </div>
    )
  }
}