package com.pagibig;

public class HeirRecord {
    private String pagibigId;
    private String heirCode;
    private String heirName;
    private String relationship;
    private String heirDateBirth;

    public HeirRecord(String pagibigId, String heirCode, String heirName, String relationship, String heirDateBirth) {
        this.pagibigId = pagibigId;
        this.heirCode = heirCode;
        this.heirName = heirName;
        this.relationship = relationship;
        this.heirDateBirth = heirDateBirth;
    }

    public String getPagibigId() {
        return pagibigId;
    }

    public void setPagibigId(String pagibigId) {
        this.pagibigId = pagibigId;
    }

    public String getHeirCode() {
        return heirCode;
    }

    public void setHeirCode(String heirCode) {
        this.heirCode = heirCode;
    }

    public String getHeirName() {
        return heirName;
    }

    public void setHeirName(String heirName) {
        this.heirName = heirName;
    }

    public String getRelationship() {
        return relationship;
    }

    public void setRelationship(String relationship) {
        this.relationship = relationship;
    }

    public String getHeirDateBirth() {
        return heirDateBirth;
    }

    public void setHeirDateBirth(String heirDateBirth) {
        this.heirDateBirth = heirDateBirth;
    }
}
