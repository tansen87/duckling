use std::fs;
use std::path::Path;

use async_trait::async_trait;
use duckdb::Connection;

use crate::api;
use crate::dialect::RawArrowData;
use crate::dialect::{Dialect, TreeNode};
use crate::utils::write_csv;

#[derive(Debug, Default)]
pub struct FolderDialect {
  pub path: String,
  pub cwd: Option<String>,
}

#[async_trait]
impl Dialect for FolderDialect {
  async fn get_db(&self) -> anyhow::Result<TreeNode> {
    directory_tree(self.path.as_str()).ok_or_else(|| anyhow::anyhow!("null"))
  }

  async fn query(&self, sql: &str, limit: usize, offset: usize) -> anyhow::Result<RawArrowData> {
    api::query(":memory:", sql, limit, offset, self.cwd.clone())
  }

  async fn table_row_count(&self, table: &str, cond: &str) -> anyhow::Result<usize> {
    let conn = self.connect()?;
    let sql = self._table_count_sql(table, cond);
    let total = conn.query_row(&sql, [], |row| row.get::<_, u32>(0))?;
    let total = total.to_string().parse()?;
    Ok(total)
  }

  async fn export(&self, sql: &str, file: &str) {
    let data = api::fetch_all(":memory:", sql, self.cwd.clone());
    if let Ok(batch) = data {
      write_csv(file, &batch);
    }
  }
}

impl FolderDialect {
  fn new(path: &str) -> Self {
    Self {
      path: String::from(path),
      cwd: None,
    }
  }

  fn connect(&self) -> anyhow::Result<Connection> {
    Ok(Connection::open_in_memory()?)
  }
}

pub fn directory_tree<P: AsRef<Path>>(path: P) -> Option<TreeNode> {
  let path = path.as_ref();
  let is_dir = path.is_dir();
  let name = path.file_name().unwrap().to_string_lossy().to_string();

  let support_types = ["csv", "xlsx", "parquet"];

  let mut node_type = String::from("path");

  if !is_dir {
    if let Some(file_ext) = path.extension() {
      let file_ext = file_ext.to_string_lossy().to_string();
      if !support_types.contains(&file_ext.as_str()) {
        return None;
      }

      if name.starts_with("~$") && name.ends_with(".xlsx") {
        return None;
      }

      if name.starts_with("~$") && file_ext == "xlsx" {
        return None;
      }

      node_type = file_ext;
    }
  };

  let mut children = None;

  if is_dir {
    if let Ok(entries) = fs::read_dir(path) {
      let mut child_nodes = Vec::new();
      for entry in entries {
        if let Ok(entry) = entry {
          let child_path = entry.path();
          if let Some(child_node) = directory_tree(&child_path) {
            child_nodes.push(child_node);
          }
        }
      }

      child_nodes.sort_by(|a, b| {
        (a.node_type == "path")
          .cmp(&(b.node_type == "path"))
          .reverse()
          .then(a.name.cmp(&b.name))
      });

      children = Some(child_nodes);
    }
  }

  Some(TreeNode {
    name,
    path: path.display().to_string().replace('\\', "/"),
    children,
    node_type,
  })
}

#[tokio::test]
async fn test_table() {
  use arrow::util::pretty::print_batches;
  let d = FolderDialect::new("D:/Code/duckdb/data/parquet-testing");
  let res = d
    .query_table(
      "read_parquet('D:/Code/duckdb/data/parquet-testing/date_stats.parquet')",
      0,
      0,
      "",
    )
    .await
    .unwrap();
  let _ = print_batches(&[res.batch]);
}
