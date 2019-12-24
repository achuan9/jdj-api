
import Db from '../lib/mysqldb.js';

class CastBoolean {
    /**
   * 将 MySQL BIT（1）/ TINYINT（1）字段的查询结果从MySQL数值转换为JavaScript的Boolean值
   *
   * @param   {Array} result - mysq2 query()的结果.
   * @returns {Array} [rows, fields] 正确转换布尔值后的结果.
   *
   * @example
   *   const result = await Db.query('Select * From User');
   *   const [users] = castBoolean.fromMysql(result);
   */
    static fromMysql(result) {
        const [ rows, fields ] = result;
        const rowsCast = rows.map(row => {
            fields.forEach(field => {
                // Note: 0x01 = TINYINT，0x10 = BIT; 如何最好地从这里访问mysql.Types?
                const boolean =
          (field.columnType == 0x01 || field.columnType == 0x10) && field.columnLength == 1;
                if (boolean) row[field.name] = row[field.name] === null ? null : row[field.name] == 1;
            });
            return row;
        });
        return [ rowsCast, fields ];
    }

    /**
   * 将字符串true / false / null值（由API POST / PATCH主体接收）转换为JavaScript布尔值，其中表字段为MySQL BIT（1）/ TINYINT（1）。
   *
   * @param   {string} table 正在强制转换（检查字段类型）的表名

   * @param   {Object} values
   * @returns {Object} 转换的值
   *
   * @example
   *   ctx.request.body = await castBoolean.fromStrings('Member', ctx.request.body);
   *   const id = await User.insert(ctx.request.body);
   */
    static async fromStrings(table, values) {
        const castValues = values;
        const fields = await Db.query('Describe ' + table);
        fields[0].forEach(field => {
            const boolean = field.Type == 'tinyint(1)' || field.Type == 'bit(1)';
            if (boolean && field.Field in values) {
                castValues[field.Field] =
          values[field.Field] == '' ? null : JSON.parse(values[field.Field].toLowerCase());
            }
        });
        return castValues;
    }
}


export default CastBoolean;
