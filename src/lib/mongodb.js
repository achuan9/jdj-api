/**
 * MongoDB 链接
 */

import { MongoClient } from 'mongodb';
import Debug from 'debug';

const debug = Debug('app:mongodb');

let db = null;

class MongoDb {
    /**
   * 获取特定的 collection
   *
   * @param   {string} collectionName - collection 的名称
   * @returns {Object} 返回的 collection.
   *
   * @example
   *   const booksColln = await Db.collection('books');
   *   const books = await booksColln.find({ author: 'David' }).toArray();
   */
    static async collection(collectionName) {
        if (!db) await setupConnection();
        const collection = db.collection(collectionName);
        if (!collection) throw new Error(`Collection ${collectionName} not found`);
        return collection;
    }

    /**
   * 获取数据库中所有的 collection.
   *
   * @returns {Object[]}
   */
    static async collections() {
        if (!db) await setupConnection();

        return db.collections();
    }

    /**
   * 创建一个 collection.
   *
   * @param {string} collectionName - collection 的名称
   */
    static async createCollection(collectionName) {
        if (!db) await setupConnection();
        debug('MongoDb.createCollection', collectionName);

        await db.createCollection(collectionName);
    }

    /**
   * 执行数据库命令
   *
   * @param {Object} command - 命令
   */

    static async command(command) {
        if (!db) await setupConnection();
        debug('MongoDb.command', command);

        await db.command(command);
    }
}

/**
 * 建立链接
 *
 */
async function setupConnection() {
    const connectionString = process.env.DB_MONGO_CONNECTION;
    if (!connectionString) throw new Error('No MongoDB configuration available');
    debug('MongoDb.setupConnection');

    const client = await MongoClient.connect(connectionString, {
        useNewUrlParser: true,
    });
    db = client.db(client.s.options.dbName);
}


export default MongoDb;
