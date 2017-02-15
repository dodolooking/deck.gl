import React, {Component} from 'react';
import pureRender from 'pure-render-decorator';

@pureRender
export default class GenericInput extends Component {

  render() {
    const {displayName, name, displayValue, checked, onChange, type} = this.props;
    const props = {...this.props};
    delete props.displayName;
    delete props.displayValue;

    return type !== 'checkbox' ? (
      <div className={"input input-" + type}>
        <label>{displayName}</label>
        <input
          {...props}
          value={displayValue}
          checked={checked}
          onChange={ e => onChange(name, e.target.value, e.target.checked) }/>
      </div>
    ) : (
      <div className={"input input-" + type}><input
          {...props}
          value={displayValue}
          checked={checked}
          onChange={ e => onChange(name, e.target.value, e.target.checked) }/><label>{displayName}</label>
      </div>
    );
  }
}
