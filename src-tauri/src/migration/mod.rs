pub mod condition_existence;
pub mod v1_to_v2;
pub mod variant_single_selection;
use serde_json::Value;

pub fn migrate_data(v: &Value, mixed_generators: Option<&Value>) -> Result<Value, String> {
    let mut data = v1_to_v2::migrate_data(v, mixed_generators)?;
    condition_existence::migrate_data(&mut data)?;
    variant_single_selection::migrate_data(&mut data);
    Ok(data)
}
pub fn migrate_generators(v: &Value, data: &Value) -> Result<Value, String> {
    v1_to_v2::migrate_generators(v, data)
}
