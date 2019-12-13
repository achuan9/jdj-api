/**  
 * MySQL 数据库
*/

import mysql from 'mysql2/promise.js';
import Debug from 'debug';

const debug = Debug('app:mysql');

let connectionPool = null;


class MysqlDb {

    /**
     * 查询
     *
     * @param   {string} sql - SQL语句
     * @param   {Array}  values - SQL占位符中要替换的值
     * @returns 包含结果行数组和字段数组的数组
     *
     * @example
     *   const [ books ] = await Db.query('Select * From Books Where Author = ?', [ 'David' ]);
     */
    static async query(sql, values) {
        if (!connectionPool) await setupConnectionPool();
        debug('MysqlDb.query', sql.trim().split('\n')[0]+(sql.trim().split('\n').length>1?'...':''));
        return connectionPool.query(sql, values);
    }

    /**
     * 获取与数据库的链接
     *
     * 这对于在事务中执行多个查询或在后续查询之间共享数据对象（例如临时表）很有用。连接必须释放。
     * @example
     *   const db = await Db.connect();
     *   await db.beginTransaction();
     *   try {
     *       await db.query('Insert Into Posts Set Title = ?', title);
     *       await db.query('Insert Into Log Set Data = ?', log);
     *       await db.commit();
     *   } catch (e) {
     *       await db.rollback();
     *       throw e;
     *   }
     *   db.release();
     *
     * @returns {Object} 数据库链接对象.
     */
    static async connect() {
        if (!connectionPool) await setupConnectionPool();
        debug('MysqlDb.connect');

        const db = await connectionPool.getConnection();

        return db;
    }


    /**
     * 返回用于连接到MySQL的连接参数（从DB_MYSQL_CONNECTION环境变量获取，
     * 该环境变量应为以下格式的连接字符串：host = my.host.com; user = my-un; password = my-pw; database = my-db ”）
     *
     * @returns 具有主机，用户，密码，数据库属性的对象。
     */
    static connectionParams() {
        const connectionString = process.env.DB_MYSQL_CONNECTION;
        if (!connectionString) throw new Error('No DB_MYSQL_CONNECTION available');

        const dbConfigKeyVal = connectionString.split(';').map(v => v.trim().split('='));
        const dbConfig = dbConfigKeyVal.reduce((config, v) => { config[v[0].toLowerCase()] = v[1]; return config; }, {});

        return dbConfig;
    }
}


/**
 * 应用启动后的第一个连接请求将建立连接池。
 */
async function setupConnectionPool() {
    const dbConfig = MysqlDb.connectionParams();
    dbConfig.namedPlaceholders = true;
    connectionPool = mysql.createPool(dbConfig);
    debug('MysqlDb.setupConnectionPool', `connect to ${dbConfig.host}/${dbConfig.database}`);

    // 传统模式可确保未提供的字段不被视为非null，确保有效的JavaScript日期等
    await connectionPool.query('SET SESSION sql_mode = "TRADITIONAL"');
}

// 注意错误1451：ER_ROW_IS_REFERENCED_2和 1452：ER_NO_REFERENCED_ROW_2替换了错误 1216：ER_NO_REFERENCED_ROW和 1217：ER_ROW_IS_REFERENCED;在MySQL 5.0.14（2005）中

export default MysqlDb;
