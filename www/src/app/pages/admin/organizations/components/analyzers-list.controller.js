'use strict';

import _ from 'lodash';

import AnalyzerEditController from './analyzer.edit.controller';
import editModalTpl from './analyzer.edit.modal.html';

export default class OrganizationAnalyzersController {
  constructor(
    $log,
    $q,
    $uibModal,
    AnalyzerService,
    OrganizationService,
    ModalService,
    NotificationService
  ) {
    'ngInject';

    this.$log = $log;
    this.$q = $q;
    this.$uibModal = $uibModal;
    this.AnalyzerService = AnalyzerService;
    this.OrganizationService = OrganizationService;
    this.ModalService = ModalService;
    this.NotificationService = NotificationService;

    this.state = {
      filterAvailable: '',
      filterEnabled: ''
    };
  }

  $onInit() {
    this.definitionsIds = _.difference(
      _.keys(this.analyzerDefinitions),
      _.map(this.analyzers, 'analyzerDefinitionId')
    ).sort();
  }

  openModal(mode, definition, analyzer) {
    let promise;

    if (definition && definition.baseConfig) {
      promise = this.AnalyzerService.getConfiguration(definition.baseConfig);
    } else {
      promise = this.$q.resolve({});
    }
    return promise
      .then(
        analyzerConfig => analyzerConfig,
        err => {
          if (err.status === 404) {
            return {};
          }
        }
      )
      .then(analyzerConfig => {
        let modal = this.$uibModal.open({
          animation: true,
          controller: AnalyzerEditController,
          controllerAs: '$modal',
          templateUrl: editModalTpl,
          size: 'lg',
          resolve: {
            definition: () => definition,
            configuration: () => analyzerConfig,
            analyzer: () => angular.copy(analyzer),
            mode: () => mode
          }
        });

        return modal.result;
      })
      .then(response => {
        if (mode === 'create') {
          return this.OrganizationService.enableAnalyzer(
            definition.id,
            response
          );
        } else {
          return this.OrganizationService.updateAnalyzer(
            analyzer.id,
            _.pick(response, 'configuration', 'rate', 'rateUnit', 'name')
          );
        }
      })
      .then(() => this.reload());
  }

  edit(mode, definition, analyzer) {
    this.openModal(mode, definition, analyzer)
      .then(() => {
        this.NotificationService.success('Analyzer updated successfully');
      })
      .catch(err => {
        if (!_.isString(err)) {
          this.NotificationService.error('Failed to edit the analyzer.');
        }
      });
  }

  enable(analyzerId) {
    let definition = this.analyzerDefinitions[analyzerId];
    // let promise;

    // if (_.map(definition.configurationItems, 'required').indexOf(true) !== -1) {
    //   // The analyzer requires some configurations
    //   promise = this.openModal('create', definition, {});
    // } else {
    //   promise = this.OrganizationService.enableAnalyzer(analyzerId, {
    //     name: analyzerId
    //   });
    // }

    this.openModal('create', definition, {})
      .then(() => {
        this.NotificationService.success('Analyzer enabled successfully');
      })
      .catch(err => {
        if (!_.isString(err)) {
          this.NotificationService.error('Failed to enable the analyzer.');
        }
      });
  }

  disable(analyzerId) {
    let modalInstance = this.ModalService.confirm(
      'Disable analyzer',
      'Are you sure you want to disable this analyzer? The corresponding configuration will be lost.',
      {
        flavor: 'danger',
        okText: 'Yes, disable it'
      }
    );

    modalInstance.result
      .then(() => this.OrganizationService.disableAnalyzer(analyzerId))
      .then(() => {
        this.reload();
        this.NotificationService.success('Analyzer disabled successfully');
      })
      .catch(err => {
        if (!_.isString(err)) {
          this.NotificationService.error('Unable to delete the analyzer.');
        }
      });
  }

  reload() {
    this.OrganizationService.analyzers(this.organization.id).then(analyzers => {
      this.analyzers = analyzers;
      this.$onInit();
    });
  }
}
