use std::env::{current_dir, set_current_dir};

use async_trait::async_trait;
use duckdb::Connection;

use crate::api;
use crate::api::{serialize_preview, ArrowData};
use crate::dialect::{Dialect, TreeNode};
use crate::utils::{build_tree, get_file_name, Table};

#[derive(Debug, Default)]
pub struct DuckDbDialect {
  pub path: String,
  pub cwd: Option<String>,
}

#[async_trait]
impl Dialect for DuckDbDialect {
  async fn get_db(&self) -> Option<TreeNode> {
    if let Ok(tables) = get_tables(&self.path) {
      Some(TreeNode {
        name: get_file_name(&self.path),
        path: self.path.clone(),
        node_type: "root".to_string(),
        children: Some(build_tree(tables)),
      })
    } else {
      None
    }
  }

  async fn query(&self, sql: &str, limit: usize, offset: usize) -> anyhow::Result<ArrowData> {
    api::query(&self.path, sql, limit, offset, self.cwd.clone())
  }
}

impl DuckDbDialect {
  fn get_schema(&self) -> Vec<Table> {
    if let Ok(tables) = get_tables(&self.path) {
      tables
    } else {
      vec![]
    }
  }

  fn connect(&self) -> anyhow::Result<Connection> {
    Ok(Connection::open(&self.path)?)
  }
}

pub fn get_tables(path: &str) -> anyhow::Result<Vec<Table>> {
  let db = Connection::open(path)?;
  let sql = r#"
  select table_name, table_type, table_schema, if(table_type='VIEW', 'view', 'table') as type
  from information_schema.tables order by table_type, table_name
  "#;
  let mut stmt = db.prepare(sql)?;

  let rows = stmt.query_map([], |row| {
    Ok(Table {
      table_name: row.get(0)?,
      table_type: row.get(1)?,
      table_schema: row.get(2)?,
      r#type: row.get(3)?,
    })
  })?;

  let mut tables = Vec::new();
  for row in rows {
    tables.push(row?);
  }
  Ok(tables)
}
