import React from 'react';
import PropTypes from 'prop-types';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { Tabs, Button, Popconfirm } from 'antd';
import classnames from 'classnames';

import {
  PREFIX,
  LOADING,
  YAML,
  IS_LOADING_CATALOG,
  itemGet,
  itemPost,
  itemPut,
  itemDelete,
  tabOpen,
  tabClose,
  tabCloseAll,
} from 'modules/k8s';

import Editor from './Editor';
import css from './index.css';


@connect(
  state => state[PREFIX],
  dispatch => bindActionCreators({
    itemGet,
    itemPost,
    itemPut,
    itemDelete,
    tabOpen,
    tabClose,
    tabCloseAll,
  }, dispatch),
)

export default class Content extends React.Component {

  static propTypes = {
    flags: PropTypes.object.isRequired,
    items: PropTypes.object.isRequired,
    tabs: PropTypes.object.isRequired,
    itemGet: PropTypes.func.isRequired,
    itemPost: PropTypes.func.isRequired,
    itemPut: PropTypes.func.isRequired,
    itemDelete: PropTypes.func.isRequired,
    tabOpen: PropTypes.func.isRequired,
    tabClose: PropTypes.func.isRequired,
    tabCloseAll: PropTypes.func.isRequired,
    defaultTab: PropTypes.string,
  };

  static defaultProps = {
    defaultTab: '',
  };

  static renderTab(props) {
    const { id, item, yaml } = props;
    const {
      metadata: { name, namespace } = {},
      [YAML]: yamlOriginal,
    } = item || {};

    let title = '';
    if (namespace) title += namespace;
    if (namespace && name) title += ' / ';
    title += name || 'Untitled';

    return (
      <Tabs.TabPane
        key={id}
        tab={
          <span
            className={classnames({
              [css.tabModified]: yaml && yaml !== yamlOriginal,
              [css.tabDetached]: !item,
            })}>
            {title}
          </span>
        }
        closable
      />
    );
  }

  state = {
    /* id: yaml */
  };

  shouldComponentUpdate(props) {
    return !props.flags[IS_LOADING_CATALOG];
  }

  componentDidMount() {
    const { defaultTab, tabOpen } = this.props;
    if (defaultTab) tabOpen(defaultTab);
  }

  tabsOnChange = id => {
    this.props.tabOpen(id);
  };

  tabsOnEdit = (id, action) => {
    switch (action) {
      case 'add':
        const {
          props: {
            tabs: {
              id: tabId,
            },
            items: {
              [tabId]: {
                [YAML]: itemYaml,
              } = {},
            },
            tabOpen,
          },
          state: {
            [tabId]: tabYaml,
          },
        } = this;
        return tabOpen(
          null,
          tabYaml || itemYaml,
          ({ id, yaml }) => this.setState({ [id]: yaml }),
        );
      case 'remove':
        const {
          props: {
            tabClose,
          },
        } = this;
        return tabClose(id);
      default:
        return false;
    }
  };

  onEdit = yaml => {
    const { tabs: { id }} = this.props;
    this.setState({ [id]: yaml });
  };

  onDiscard = () => {
    this.onEdit(null);
  };

  onClose = () => {
    const { tabs: { id }, tabClose } = this.props;
    tabClose(id);
  };

  onCloseAll = () => {
    this.props.tabCloseAll();
  };

  onReload = () => {
    const {
      props: {
        tabs: { id },
        itemGet,
      },
      onDiscard,
    } = this;
    return new Promise(resolve => itemGet(id, resolve)).then(onDiscard);
  };

  onSave = () => {
    const {
      props: {
        tabs: { id },
        items: { [id]: item },
        itemPost,
        itemPut,
      },
      state: { [id]: yaml },
      onDiscard,
    } = this;
    return new Promise(resolve => (item ? itemPut : itemPost)(id, yaml, resolve)).then(onDiscard);
  };

  onDelete = () => {
    const {
      props: {
        tabs: { id },
        itemDelete,
      },
      onDiscard,
    } = this;
    return new Promise(resolve => itemDelete(id, resolve)).then(onDiscard);
  };

  render() {
    const {
      props: {
        items,
        tabs: {
          id,
          ids: tabIds,
        },
      },
      state,
      state: {
        [id]: yamlEdited,
      },
      tabsOnChange,
      tabsOnEdit,
      onEdit,
      onClose,
      onCloseAll,
      onReload,
      onSave,
      onDelete,
    } = this;

    const item = items[id];
    const yamlOriginal = item && item[YAML];

    const dirty = yamlEdited && yamlEdited !== yamlOriginal;
    const yaml = yamlEdited || yamlOriginal;

    const hideTabs = false;
    const hideEditor = !tabIds.length;

    const showCloseAll = !!tabIds.length;
    const itemLoading = item && item[LOADING];

    return (
      <div
        className={classnames(
          css.content,
          {
            [css.hideTabs]: hideTabs,
            [css.hideEditor]: hideEditor,
          },
        )}>
        <Tabs
          type="editable-card"
          activeKey={id}
          onChange={tabsOnChange}
          onEdit={tabsOnEdit}
          tabBarExtraContent={
            <span>
              <Button
                className={css.button}
                size="small"
                onClick={onCloseAll}
                disabled={!showCloseAll}>
                CloseAll
              </Button>
              <Button
                className={css.button}
                size="small"
                onClick={onReload}
                disabled={!item || itemLoading}>
                Reload
              </Button>
              <Button
                className={css.button}
                size="small"
                type="primary"
                onClick={onSave}
                disabled={!dirty || itemLoading}>
                Save
              </Button>
              <Popconfirm
                placement="bottomRight"
                title="Are you sure to delete this item?"
                okText="Yes" cancelText="No"
                onConfirm={onDelete}>
                <Button
                  className={css.button}
                  size="small"
                  type="danger"
                  disabled={!item || itemLoading}>
                  Delete
                </Button>
              </Popconfirm>
            </span>
          }>
          {
            tabIds.map(itemId =>
              Content.renderTab({
                id: itemId,
                item: items[itemId],
                yaml: state[itemId],
              })
            )
          }
        </Tabs>
        <Editor
          value={yaml}
          onChange={onEdit}
          onSave={onSave}
          onClose={onClose}
          onReload={onReload}
        />
        {
          hideEditor &&
          <table className={css.legend}>
            <tbody>
              <tr>
                <td>⌘&nbsp;+&nbsp;⌥&nbsp;+&nbsp;S</td>
                <td>Tab.Save</td>
              </tr>
              <tr>
                <td>⌘&nbsp;+&nbsp;⌥&nbsp;+&nbsp;C</td>
                <td>Tab.Close</td>
              </tr>
              <tr>
                <td>⌘&nbsp;+&nbsp;⌥&nbsp;+&nbsp;R</td>
                <td>Tab.Reload</td>
              </tr>
            </tbody>
          </table>
        }
      </div>
    );
  }
}
